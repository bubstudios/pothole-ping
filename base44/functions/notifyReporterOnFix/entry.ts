import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data, event } = body;

    if (event?.type !== 'update' || data?.status !== 'fixed') {
      return Response.json({ skipped: 'not_a_fix_event' });
    }

    const reporterId = data.created_by_id;
    const fixerId = data.fixed_by;

    if (!reporterId || reporterId === fixerId) {
      return Response.json({ skipped: reporterId === fixerId ? 'self_fix' : 'no_reporter' });
    }

    try {
      const users = await base44.asServiceRole.entities.User.list();
      const reporter = users.find((u) => u.id === reporterId);

      if (reporter?.email) {
        await base44.integrations.Core.SendEmail({
          to: reporter.email,
          subject: 'Your pothole report was marked as fixed!',
          body: `Good news! The pothole you reported at:\n${data.address || `${data.latitude}, ${data.longitude}`}\n\nHas been marked as fixed by a community member.\n\nCheck the app to confirm the fix is real, or dispute it if the pothole is still there.\n\n— PotholePing`,
        });
      }

      return Response.json({ notified: true });
    } catch (e) {
      console.error('Failed to notify reporter:', e.message);
      return Response.json({ notified: false, error: e.message });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});