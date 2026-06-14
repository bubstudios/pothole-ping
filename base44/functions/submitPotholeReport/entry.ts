import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportId } = await req.json();
    if (!reportId) return Response.json({ error: 'reportId required' }, { status: 400 });

    const report = await base44.entities.PotholeReport.get(reportId);
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    const results = { email: null, open311: null };

    // Email submission
    if (report.submission_email) {
      try {
        const body = [
          `POTHOLE REPORT — Please Fix`,
          ``,
          `Location: ${report.address || `${report.latitude}, ${report.longitude}`}`,
          `Coordinates: ${report.latitude}, ${report.longitude}`,
          `Severity: ${report.severity?.toUpperCase()}`,
          `Description: ${report.description || 'No description provided'}`,
          `Photo: ${report.photo_url || 'None'}`,
          `Reported via: PotholePing app`,
          ``,
          `Google Maps: https://www.google.com/maps?q=${report.latitude},${report.longitude}`,
        ].join('\n');

        await base44.integrations.Core.SendEmail({
          to: report.submission_email,
          subject: `Pothole Report — ${report.address || 'Unnamed Location'} — ${report.severity?.toUpperCase()}`,
          body,
        });

        results.email = 'sent';
        await base44.entities.PotholeReport.update(reportId, {
          submission_status: 'email_sent',
          submission_details: `Email sent to ${report.submission_email}`,
        });
      } catch (e) {
        results.email = 'failed: ' + e.message;
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});