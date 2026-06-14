import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const severityWeights = {
  minor: 0.3,
  moderate: 0.5,
  severe: 0.8,
  dangerous: 1.0,
};

export default function HeatmapLayer({ potholes, enabled, severityFilter, timeRange }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !map) return;

    // Filter by time
    const now = Date.now();
    const timeCutoffs = {
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000,
      '3months': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    };

    const filtered = potholes.filter(p => {
      if (p.status === 'fixed') return false;
      const age = now - new Date(p.created_date).getTime();
      if (age > timeCutoffs[timeRange]) return false;
      if (severityFilter !== 'all' && p.severity !== severityFilter) return false;
      return true;
    });

    const points = filtered.map(p => [
      p.latitude,
      p.longitude,
      severityWeights[p.severity] || 0.5,
    ]);

    const heatLayer = L.heatLayer(points, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.2: '#2b83ba',
        0.4: '#abdda4',
        0.6: '#ffffbf',
        0.8: '#fdae61',
        1.0: '#d7191c',
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [enabled, potholes, severityFilter, timeRange, map]);

  return null;
}