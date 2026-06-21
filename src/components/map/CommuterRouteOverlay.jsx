import React, { useEffect } from 'react';
import { Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import FollowRoutePosition from '@/components/map/FollowRoutePosition';

const waypointIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function FitRouteBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length) {
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });
    }
  }, [map, coords]);
  return null;
}

export default function CommuterRouteOverlay({ routeData, userPosition, followRoute = false }) {
  if (!routeData) return null;

  const directCoords = routeData.direct?.coordinates?.map(c => [c[1], c[0]]) || [];
  const altCoords = routeData.alternate?.coordinates?.map(c => [c[1], c[0]]) || [];
  const wp = routeData.waypoint;

  return (
    <>
      {directCoords.length > 0 && (
        <Polyline positions={directCoords} color="#f97316" weight={2} opacity={0.35} dashArray="8 8" />
      )}
      {altCoords.length > 0 && (
        <Polyline positions={altCoords} color="#22c55e" weight={4} />
      )}
      {wp && <Marker position={[wp.lat, wp.lng]} icon={waypointIcon} />}
      <FitRouteBounds coords={altCoords.length > 0 ? altCoords : directCoords} />
      <FollowRoutePosition
        coordinates={altCoords.length > 0 ? altCoords : directCoords}
        userPosition={userPosition}
        enabled={followRoute && !!userPosition}
      />
    </>
  );
}