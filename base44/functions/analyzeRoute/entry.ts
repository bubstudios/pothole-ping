import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALERT_RADIUS_FT = 300;
const FEET_PER_METER = 3.28084;

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

function midpoint(lat1, lng1, lat2, lng2) {
  return [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
}

async function getOSRMRoute(lng1, lat1, lng2, lat2) {
  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.length) return null;

  // Parse steps into simplified format for frontend navigation
  const steps = (data.routes[0].legs?.[0]?.steps || []).map(s => ({
    distance: s.distance,
    duration: s.duration,
    name: s.name || '',
    maneuver: s.maneuver ? { type: s.maneuver.type, modifier: s.maneuver.modifier } : null,
    coordinates: s.geometry?.coordinates?.map(c => [c[1], c[0]]) || [],
  }));

  return {
    distanceMeters: data.routes[0].distance,
    durationSeconds: data.routes[0].duration,
    geometry: data.routes[0].geometry,
    steps,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { start_lat, start_lng, end_lat, end_lng } = body;

    if (!start_lat || !start_lng || !end_lat || !end_lng) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Get direct route
    const directRoute = await getOSRMRoute(start_lng, start_lat, end_lng, end_lat);
    if (!directRoute) return Response.json({ error: 'No route found' }, { status: 404 });

    // Fetch all active potholes
    const potholes = await base44.asServiceRole.entities.PotholeReport.filter(
      { status: { $in: ['reported', 'acknowledged', 'in_progress'] } },
      '-created_date',
      200
    );

    // Find potholes on route (check against route geometry segments)
    const onRoute = [];
    const coords = directRoute.geometry.coordinates;
    for (const p of potholes) {
      const plat = Number(p.latitude);
      const plng = Number(p.longitude);
      if (isNaN(plat) || isNaN(plng)) continue;

      let minDist = Infinity;
      for (let i = 0; i < coords.length - 1; i++) {
        const d = pointToSegmentDistFt(plat, plng, coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
        if (d < minDist) minDist = d;
      }

      if (minDist <= ALERT_RADIUS_FT) {
        onRoute.push({ id: p.id, latitude: plat, longitude: plng, severity: p.severity, address: p.address, distance_ft: Math.round(minDist) });
      }
    }

    // Generate alternate route that avoids potholes
    let alternateRoute = null;
    if (onRoute.length > 0) {
      // Find the center of potholes and their position along the route
      const potholeCenter = onRoute.reduce(
        (acc, p) => [acc[0] + p.latitude, acc[1] + p.longitude],
        [0, 0]
      );
      potholeCenter[0] /= onRoute.length;
      potholeCenter[1] /= onRoute.length;

      // Calculate a unit vector perpendicular to the route
      const routeDx = end_lng - start_lng;
      const routeDy = end_lat - start_lat;
      const routeLen = Math.sqrt(routeDx * routeDx + routeDy * routeDy) || 1;
      const perpX = -routeDy / routeLen;
      const perpY = routeDx / routeLen;

      // Interpolate the detour point along the route near the potholes
      const routeVec = [routeDx, routeDy];
      const potholeVec = [potholeCenter[0] - start_lng, potholeCenter[1] - start_lat];
      let t = (potholeVec[0] * routeVec[0] + potholeVec[1] * routeVec[1]) / (routeLen * routeLen);
      t = Math.max(0.15, Math.min(0.85, t));
      const detourLat = start_lat + routeDy * t;
      const detourLng = start_lng + routeDx * t;

      // Try offsets at the pothole cluster point AND at midpoint
      const detourPoints = [
        { lat: detourLat, lng: detourLng, label: 'near_pothole' },
      ];
      const [midLat, midLng] = midpoint(start_lat, start_lng, end_lat, end_lng);
      if (Math.abs(t - 0.5) > 0.2) {
        detourPoints.push({ lat: midLat, lng: midLng, label: 'midpoint' });
      }

      // Try multiple perpendicular offsets in BOTH directions
      const offsets = [0.12, 0.25, 0.5]; // ~600-2600ft
      const allWaypoints = detourPoints.flatMap(dp =>
        offsets.flatMap(om =>
          [-1, 1].map(dir => {
            const offsetDeg = (om / 69) * dir;
            return {
              offsetMiles: om,
              detourPoint: dp.label,
              lat: dp.lat + perpX * offsetDeg,
              lng: dp.lng + perpY * offsetDeg,
            };
          })
        )
      );

      // Fetch all OSRM routes in parallel
      const fetchResults = await Promise.allSettled(
        allWaypoints.flatMap(wp => [
          getOSRMRoute(start_lng, start_lat, wp.lng, wp.lat).then(r => ({ result: r, wp, leg: 1 })),
          getOSRMRoute(wp.lng, wp.lat, end_lng, end_lat).then(r => ({ result: r, wp, leg: 2 })),
        ])
      );

      // Group results by waypoint
      const candidates = [];
      for (const wp of allWaypoints) {
        const leg1Data = fetchResults.find(r =>
          r.status === 'fulfilled' && r.value?.wp?.lat === wp.lat && r.value.leg === 1
        )?.value;
        const leg2Data = fetchResults.find(r =>
          r.status === 'fulfilled' && r.value?.wp?.lat === wp.lat && r.value.leg === 2
        )?.value;
        const leg1 = leg1Data?.result;
        const leg2 = leg2Data?.result;
        if (!leg1 || !leg2) continue;

        // Check if this detour avoids the potholes
        const detourCoords = [...leg1.geometry.coordinates, ...leg2.geometry.coordinates];
        const stillOnRoute = onRoute.filter((p) => {
          let minD = Infinity;
          for (let i = 0; i < detourCoords.length - 1; i++) {
            const d = pointToSegmentDistFt(p.latitude, p.longitude, detourCoords[i][1], detourCoords[i][0], detourCoords[i + 1][1], detourCoords[i + 1][0]);
            if (d < minD) minD = d;
          }
          return minD <= ALERT_RADIUS_FT;
        });

        if (stillOnRoute.length === 0) {
          candidates.push({
            distanceMeters: leg1.distanceMeters + leg2.distanceMeters,
            durationSeconds: leg1.durationSeconds + leg2.durationSeconds,
            waypoint: { lat: wp.lat, lng: wp.lng },
            geometry: { type: 'LineString', coordinates: detourCoords },
            steps: [...(leg1.steps || []), ...(leg2.steps || [])],
          });
        }
      }

      // Pick the shortest pothole-free alternate route
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.durationSeconds - b.durationSeconds);
        alternateRoute = candidates[0];
      }
    }

    const result = {
      direct: {
        distance_miles: Math.round(directRoute.distanceMeters / 1609.34 * 10) / 10,
        duration_minutes: Math.round(directRoute.durationSeconds / 60),
        geometry: directRoute.geometry,
        steps: directRoute.steps || [],
      },
      potholes: onRoute,
      pothole_count: onRoute.length,
    };

    if (alternateRoute) {
      const timeDiff = alternateRoute.durationSeconds - directRoute.durationSeconds;
      result.alternate = {
        distance_miles: Math.round(alternateRoute.distanceMeters / 1609.34 * 10) / 10,
        duration_minutes: Math.round(alternateRoute.durationSeconds / 60),
        extra_minutes: Math.round(timeDiff / 60),
        geometry: alternateRoute.geometry,
        waypoint: alternateRoute.waypoint,
        steps: alternateRoute.steps || [],
        pothole_free: true,
      };
    }

    return Response.json(result);
  } catch (error) {
    console.error('analyzeRoute error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});