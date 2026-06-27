import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportId, newStatus } = body;
    if (!reportId || !newStatus) return Response.json({ error: 'Missing reportId or newStatus' }, { status: 400 });

    // Load the report (service role to read any report regardless of RLS)
    const reports = await base44.asServiceRole.entities.PotholeReport.filter({ id: reportId });
    const report = reports[0];
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    // Don't notify the owner if they're the one updating
    if (report.created_by_id === user.id) return Response.json({ skipped: 'self_update' });

    // Look up the owner's OneSignal player ID
    const reps = await base44.asServiceRole.entities.UserReputation.filter({ created_by_id: report.created_by_id });
    const playerId = reps[0]?.onesignal_player_id;
    if (!playerId) return Response.json({ skipped: 'no_player_id' });

    const address = report.address || `${report.latitude}, ${report.longitude}`;
    let heading, message;
    if (newStatus === 'fixed') {
      heading = '✅ Pothole Fixed!';
      message = `Good news — your pothole at ${address} was marked fixed. Tap to confirm it's really gone.`;
    } else if (newStatus === 'disputed') {
      heading = '⚠️ Pothole Disputed';
      message = `Someone says your reported pothole at ${address} is still there.`;
    } else {
      heading = '📍 Status Update';
      message = `Your pothole at ${address} is now ${newStatus}.`;
    }

    const restApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    if (!restApiKey) {
      console.error('ONESIGNAL_REST_API_KEY not set');
      return Response.json({ error: 'OneSignal API key not configured' }, { status: 500 });
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: 'a73c79c5-208a-4442-9a29-fd347d4b3cdd',
        include_player_ids: [playerId],
        headings: { en: heading },
        contents: { en: message },
        data: { potholeId: reportId },
      }),
    });

    const result = await res.json();
    return Response.json({ success: true, result });
  } catch (error) {
    console.error('notifyReportOwner error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});