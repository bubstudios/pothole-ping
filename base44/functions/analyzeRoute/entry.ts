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
  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.length) return null;
  return {
    distanceMeters: data.routes[0].distance,
    durationSeconds: data.routes[0].duration,
    geometry: data.routes[0].geometry,
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
      500
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
      // Find the geometric center of all potholes on route
      const potholeCenter = onRoute.reduce(
        (acc, p) => [acc[0] + p.latitude, acc[1] + p.longitude],
        [0, 0]
      );
      potholeCenter[0] /= onRoute.length;
      potholeCenter[1] /= onRoute.length;

      // Find the route midpoint
      const [midLat, midLng] = midpoint(start_lat, start_lng, end_lat, end_lng);

      // Calculate a waypoint perpendicular to the route, opposite side from pothole cluster
      const routeDx = end_lng - start_lng;
      const routeDy = end_lat - start_lat;
      const routeLen = Math.sqrt(routeDx * routeDx + routeDy * routeDy) || 1;
      const perpX = -routeDy / routeLen;
      const perpY = routeDx / routeLen;

      // Determine which side the potholes are on
      const dot = (potholeCenter[1] - start_lat) * perpX + (potholeCenter[0] - start_lng) * perpY;
      const side = dot > 0 ? 1 : -1;

      // Place waypoint ~0.5 miles away perpendicular, opposite side from potholes
      const offsetDeg = (0.5 / 69) * side;
      const waypointLat = start_lat + routeDy / routeLen * (midLat - start_lat) * 2 + perpX * (-offsetDeg);
      const waypointLng = start_lng + routeDx / routeLen * (midLng - start_lng) * 2 + perpY * (-offsetDeg);

      const altRoute = await getOSRMRoute(start_lng, start_lat, waypointLng, waypointLat);
      if (altRoute) {
        const altRoute2 = await getOSRMRoute(waypointLng, waypointLat, end_lng, end_lat);
        if (altRoute2) {
          alternateRoute = {
            distanceMeters: altRoute.distanceMeters + altRoute2.distanceMeters,
            durationSeconds: altRoute.durationSeconds + altRoute2.durationSeconds,
            waypoint: { lat: waypointLat, lng: waypointLng },
            geometry: {
              type: 'LineString',
              coordinates: [...altRoute.geometry.coordinates, ...altRoute2.geometry.coordinates],
            },
          };
        }
      }
    }

    const result = {
      direct: {
        distance_miles: Math.round(directRoute.distanceMeters / 1609.34 * 10) / 10,
        duration_minutes: Math.round(directRoute.durationSeconds / 60),
        geometry: directRoute.geometry,
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
        pothole_free: true,
      };
    }

    return Response.json(result);
  } catch (error) {
    console.error('analyzeRoute error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});