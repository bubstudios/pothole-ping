import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

// Point-to-segment distance in feet
function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.hypot(px - x1, py - y1), proj: [x1, y1] };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { dist: Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)), proj: [x1 + t * dx, y1 + t * dy] };
}

export default function FollowRoutePosition({ coordinates, userPosition, enabled = true }) {
  const map = useMap();
  const lastMove = useRef(0);

  useEffect(() => {
    if (!enabled || !coordinates?.length || !userPosition) return;
    if (isNaN(userPosition.lat) || isNaN(userPosition.lng)) return;

    const now = Date.now();
    if (now - lastMove.current < 2000) return;
    lastMove.current = now;

    // Find nearest point on route polyline
    let best = { dist: Infinity, proj: [coordinates[0][0], coordinates[0][1]] };
    for (let i = 0; i < coordinates.length - 1; i++) {
      const a = coordinates[i];
      const b = coordinates[i + 1];
      if (!a || !b) continue;
      const result = pointToSegmentDist(
        userPosition.lat, userPosition.lng,
        a[0], a[1], b[0], b[1]
      );
      if (result.dist < best.dist) best = result;
    }

    map.panTo([userPosition.lat, userPosition.lng], { animate: true, duration: 1.5 });
  }, [userPosition?.lat, userPosition?.lng, coordinates, map, enabled]);

  return null;
}