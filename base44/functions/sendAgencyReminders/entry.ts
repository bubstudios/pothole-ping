import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reports = await base44.asServiceRole.entities.PotholeReport.filter(
      { status: { $in: ['reported', 'acknowledged', 'in_progress'] } },
      '-created_date',
      200
    );

    const now = new Date();
    let sentCount = 0;

    for (const report of reports) {
      const daysSince = Math.max(0, (now - new Date(report.created_date)) / (1000 * 60 * 60 * 24));
      if (daysSince < 14 || !report.submission_email) continue;

      const lastReminded = report.last_reminded_date ? new Date(report.last_reminded_date) : null;
      if (lastReminded && (now - lastReminded) / (1000 * 60 * 60 * 24) < 14) continue;

      try {
        await base44.integrations.Core.SendEmail({
          to: report.submission_email,
          subject: `Reminder: Unfixed pothole — ${report.address || 'unknown location'}`,
          body: `This is an automated reminder from the PotholePing community.\n\nA ${report.severity} pothole reported ${Math.round(daysSince)} days ago at:\n${report.address || `${report.latitude}, ${report.longitude}`}\n\nCurrent status: ${report.status}\n\nIt has not yet been marked as fixed. Please respond or update its status.\n\nThank you for keeping our roads safe!\n\n— PotholePing Community`,
        });

        await base44.asServiceRole.entities.PotholeReport.update(report.id, {
          last_reminded_date: now.toISOString(),
        });

        sentCount++;
      } catch (e) {
        console.error('Failed reminder for', report.id, e.message);
      }
    }

    return Response.json({ sent: sentCount });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});