import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    // Delete user's pothole reports
    const reports = await base44.asServiceRole.entities.PotholeReport.filter({ created_by_id: userId }, '', 500);
    for (const r of reports) {
      await base44.asServiceRole.entities.PotholeReport.delete(r.id);
    }

    // Delete user's comments
    const comments = await base44.asServiceRole.entities.PotholeComment.filter({ created_by_id: userId }, '', 500);
    for (const c of comments) {
      await base44.asServiceRole.entities.PotholeComment.delete(c.id);
    }

    // Delete user's reputation
    const reps = await base44.asServiceRole.entities.UserReputation.filter({ created_by_id: userId });
    for (const r of reps) {
      await base44.asServiceRole.entities.UserReputation.delete(r.id);
    }

    // Delete user's avoidances
    const avoidances = await base44.asServiceRole.entities.PotholeAvoidance.filter({ created_by_id: userId }, '', 500);
    for (const a of avoidances) {
      await base44.asServiceRole.entities.PotholeAvoidance.delete(a.id);
    }

    // Delete user's vehicle damage reports
    const damages = await base44.asServiceRole.entities.VehicleDamage.filter({ created_by_id: userId }, '', 500);
    for (const d of damages) {
      await base44.asServiceRole.entities.VehicleDamage.delete(d.id);
    }

    // Delete user's watch zone subscriptions
    const subs = await base44.asServiceRole.entities.UserWatchZone.filter({ created_by_id: userId }, '', 500);
    for (const s of subs) {
      await base44.asServiceRole.entities.UserWatchZone.delete(s.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});