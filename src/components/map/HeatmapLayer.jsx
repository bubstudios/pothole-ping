import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const severityWeights = {
  minor: 0.3,
  moderate: 0.5,
  severe: 0.8,
  dangerous: 1.0,
};

const HeatCanvasLayer = L.Layer.extend({
  initialize: function (options) {
    this._options = options || {};
    this._canvas = null;
    this._ctx = null;
    this._points = [];
    this._needsRedraw = true;
  },

  setData: function (points) {
    this._points = points || [];
    this._needsRedraw = true;
    if (this._canvas && this._map) {
      this._draw();
    }
  },

  onAdd: function (map) {
    this._map = map;
    const pane = map.getPanes().overlayPane;
    this._canvas = L.DomUtil.create('canvas', 'heatmap-canvas');
    this._canvas.style.position = 'absolute';
    this._canvas.style.pointerEvents = 'none';
    this._canvas.style.zIndex = '200';
    pane.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    map.on('moveend', this._reset, this);
    map.on('zoomend', this._reset, this);
    this._reset();
  },

  onRemove: function (map) {
    if (this._canvas) {
      L.DomUtil.remove(this._canvas);
    }
    map.off('moveend', this._reset, this);
    map.off('zoomend', this._reset, this);
    this._canvas = null;
    this._ctx = null;
  },

  _reset: function () {
    const map = this._map;
    if (!map || !this._canvas) return;
    const size = map.getSize();
    const bounds = map.getBounds();
    const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
    const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
    const offset = topLeft;

    this._canvas.width = size.x;
    this._canvas.height = size.y;
    L.DomUtil.setPosition(this._canvas, offset);
    this._draw();
  },

  _draw: function () {
    if (!this._ctx || !this._canvas) return;
    const ctx = this._ctx;
    const map = this._map;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!this._points.length) return;

    const radius = this._options.radius || 30;
    const blur = this._options.blur || 20;
    const max = this._options.max || 1.0;

    // Build intensity grid using offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');

    for (const pt of this._points) {
      const pos = map.latLngToContainerPoint([pt[0], pt[1]]);
      const intensity = pt[2] || 0.5;
      const alpha = Math.min(intensity / max, 1.0);

      // Draw radial gradient for each point
      const gradient = offCtx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius + blur);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha * 0.7})`);
      gradient.addColorStop(radius / (radius + blur), `rgba(255, 100, 0, ${alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

      offCtx.fillStyle = gradient;
      offCtx.fillRect(pos.x - radius - blur, pos.y - radius - blur, (radius + blur) * 2, (radius + blur) * 2);
    }

    // Apply color gradient
    const imageData = offCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const intensity = data[i + 3] / 255; // alpha channel = intensity

      if (intensity < 0.05) {
        data[i + 3] = 0;
        continue;
      }

      // Blue -> Green -> Yellow -> Orange -> Red gradient
      let r, g, b;
      if (intensity < 0.25) {
        const t = intensity / 0.25;
        r = Math.round(43 + t * (171 - 43));
        g = Math.round(131 + t * (210 - 131));
        b = Math.round(186 + t * (166 - 186));
      } else if (intensity < 0.5) {
        const t = (intensity - 0.25) / 0.25;
        r = Math.round(171 + t * (255 - 171));
        g = Math.round(210 + t * (255 - 210));
        b = Math.round(166 + t * (190 - 166));
      } else if (intensity < 0.75) {
        const t = (intensity - 0.5) / 0.25;
        r = 255;
        g = Math.round(255 - t * (155));
        b = Math.round(190 - t * (100));
      } else {
        const t = (intensity - 0.75) / 0.25;
        r = 255;
        g = Math.round(100 - t * 80);
        b = Math.round(90 - t * 70);
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round(intensity * 200);
    }

    ctx.putImageData(imageData, 0, 0);
  },
});

export default function HeatmapLayer({ potholes, enabled, severityFilter, timeRange }) {
  const map = useMap();
  const layerRef = useRef(null);

  // Create heat layer once
  useEffect(() => {
    if (!map) return;

    const layer = new HeatCanvasLayer({ radius: 30, blur: 20, max: 1.0 });
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  // Update data when inputs change
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !map) return;

    if (!enabled || !potholes.length) {
      layer.setData([]);
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      return;
    }

    if (!map.hasLayer(layer)) {
      map.addLayer(layer);
    }

    // Filter
    const now = Date.now();
    const timeCutoffs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      '3months': 90 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const filtered = potholes.filter(p => {
      if (p.status === 'fixed') return false;
      const age = now - new Date(p.created_date).getTime();
      if (age > timeCutoffs[timeRange]) return false;
      if (severityFilter !== 'all' && p.severity !== severityFilter) return false;
      return true;
    });

    const points = filtered.map(p => [
      Number(p.latitude),
      Number(p.longitude),
      severityWeights[p.severity] || 0.5,
    ]);

    layer.setData(points);
  }, [enabled, potholes, severityFilter, timeRange, map]);

  return null;
}