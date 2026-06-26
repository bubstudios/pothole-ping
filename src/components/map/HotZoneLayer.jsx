import { useMemo } from 'react';
import { Circle, Tooltip } from 'react-leaflet';

// Grid-based clustering: each cell is ~500ft (~0.002°)
const CELL_DEG = 0.002;
const MIN_CLUSTER = 3;

export default function HotZoneLayer({ potholes, enabled }) {
  const hotZones = useMemo(() => {
    if (!enabled || !potholes?.length) return [];

    const cells = {};
    const unfixed = potholes.filter((p) => p.status !== 'fixed');

    unfixed.forEach((p) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const gx = Math.round(lng / CELL_DEG) * CELL_DEG;
      const gy = Math.round(lat / CELL_DEG) * CELL_DEG;
      const key = `${gy.toFixed(6)},${gx.toFixed(6)}`;
      if (!cells[key]) cells[key] = { lat: gy, lng: gx, count: 0, reports: [] };
      cells[key].count++;
      cells[key].reports.push(p);
    });

    return Object.values(cells).filter((c) => c.count >= MIN_CLUSTER);
  }, [potholes, enabled]);

  if (!enabled || hotZones.length === 0) return null;

  return hotZones.map((zone, i) => (
    <Circle
      key={`hz-${i}`}
      center={[zone.lat, zone.lng]}
      radius={300}
      pathOptions={{
        color: '#dc2626',
        fillColor: '#dc2626',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '6 4',
      }}
    >
      <Tooltip direction="center" permanent className="hot-zone-tooltip">
        <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
          🔥 {zone.count} potholes
        </div>
      </Tooltip>
    </Circle>
  ));
}