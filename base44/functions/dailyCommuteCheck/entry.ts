import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALERT_RADIUS_FT = 300;

function distanceFt(lat1, lng1, lat2, lng2) {
  const R = 20903520;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistFt(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distanceFt(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distanceFt(px, py, x1 + t * dx, y1 + t * dy);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const currentHour = now.getHours();

    // Get all active routes where commute_hour matches current hour
    const routes = await base44.asServiceRole.entities.UserRoute.filter(
      { commute_hour: currentHour, is_active: true },
      'created_date',
      200
    );

    if (!routes.length) return Response.json({ sent: 0, message: 'No commute alerts this hour' });

    // Get all active potholes once
    const potholes = await base44.asServiceRole.entities.PotholeReport.filter(
      { status: { $in: ['reported', 'acknowledged', 'in_progress'] } },
      '-created_date',
      200
    );

    // Group routes by user (created_by_id)
    const userRoutes = {};
    for (const r of routes) {
      const uid = r.created_by_id;
      if (!userRoutes[uid]) userRoutes[uid] = [];
      userRoutes[uid].push(r);
    }

    let sent = 0;

    for (const [userId, userRouteList] of Object.entries(userRoutes)) {
      // Get the user
      let user;
      try {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        user = users[0];
      } catch (e) {
        continue;
      }
      if (!user?.email) continue;

      const routeAlerts = [];
      for (const route of userRouteList) {
        const nearby = potholes.filter((p) => {
          const d = pointToSegmentDistFt(
            Number(p.latitude), Number(p.longitude),
            route.start_lat, route.start_lng,
            route.end_lat, route.end_lng
          );
          return d <= ALERT_RADIUS_FT;
        });
        routeAlerts.push({ name: route.name, pothole_count: nearby.length });
      }

      const totalPotholes = routeAlerts.reduce((s, r) => s + r.pothole_count, 0);

      // Build email
      let body = `<h2>🚗 Your Commute Alert — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>`;
      body += `<p>Here's your pothole report for your ${userRouteList.length > 1 ? 'routes' : 'route'} this morning:</p>`;

      for (const ra of routeAlerts) {
        const icon = ra.pothole_count === 0 ? '✅' : ra.pothole_count <= 2 ? '⚠️' : '🔴';
        body += `<p style="margin:4px 0">${icon} <strong>${ra.name}</strong>: ${ra.pothole_count} pothole${ra.pothole_count !== 1 ? 's' : ''} ${ra.pothole_count === 0 ? '(clear!)' : 'reported'}</p>`;
      }

      if (totalPotholes > 0) {
        body += `<p style="margin-top:12px">Open PotholePing to find a pothole-free alternate route and save on repairs.</p>`;
      } else {
        body += `<p style="margin-top:12px">All routes clear — enjoy the drive! 🎉</p>`;
      }

      body += `<p style="color:#888;font-size:12px;margin-top:16px">— PotholePing</p>`;

      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `🚗 Commute Alert: ${totalPotholes} pothole${totalPotholes !== 1 ? 's' : ''} on your route${userRouteList.length > 1 ? 's' : ''}`,
          body,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${user.email}:`, e.message);
      }
    }

    return Response.json({ sent, routes_checked: routes.length });
  } catch (error) {
    console.error('dailyCommuteCheck error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});