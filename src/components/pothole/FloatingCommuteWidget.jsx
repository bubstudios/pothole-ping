import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GripHorizontal, AlertTriangle, Shield, Navigation, ChevronUp, ChevronDown, Map } from 'lucide-react';

const SEVERITY_COLORS = {
  minor: '#eab308',
  moderate: '#f97316',
  severe: '#ef4444',
  dangerous: '#b91c1c',
};

const SEVERITY_LABELS = {
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
  dangerous: 'Dangerous',
};

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FloatingCommuteWidget({
  potholes = [],
  userPosition,
  nearestPothole,
  nearestDistance,
  isVoiceListening,
  onToggleVoice,
  onToggleMap,
  totalSavings,
  dangerNearby,
}) {
  const [position, setPosition] = useState({ x: 16, y: 120 });
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const widgetRef = useRef(null);

  // Find nearest pothole overall (not just danger zone)
  const nearestOverall = useMemo(() => {
    if (!userPosition || !potholes.length) return null;
    let minDist = Infinity;
    let nearest = null;
    for (const p of potholes) {
      const d = haversineMeters(userPosition.lat, userPosition.lng, p.latitude, p.longitude);
      if (d < minDist) { minDist = d; nearest = { ...p, distance: d }; }
    }
    return nearest;
  }, [potholes, userPosition]);

  // Count nearby potholes by severity within 500m
  const nearbyBreakdown = useMemo(() => {
    if (!userPosition) return { minor: 0, moderate: 0, severe: 0, dangerous: 0, total: 0 };
    const counts = { minor: 0, moderate: 0, severe: 0, dangerous: 0, total: 0 };
    for (const p of potholes) {
      const dist = haversineMeters(userPosition.lat, userPosition.lng, p.latitude, p.longitude);
      if (dist < 500) {
        counts[p.severity] = (counts[p.severity] || 0) + 1;
        counts.total++;
      }
    }
    return counts;
  }, [potholes, userPosition]);

  const handlePointerDown = useCallback((e) => {
    setDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.target.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;
    setPosition({
      x: Math.max(0, Math.min(maxX, dragRef.current.posX + dx)),
      y: Math.max(0, Math.min(maxY, dragRef.current.posY + dy)),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const formatDist = (m) => {
    if (m == null) return '--';
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  const heatIntensity = nearbyBreakdown.total > 10 ? 'high' : nearbyBreakdown.total > 4 ? 'medium' : nearbyBreakdown.total > 0 ? 'low' : 'none';

  return (
    <div
      ref={widgetRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-[2000] select-none"
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
    >
      {/* Collapsed pill */}
      {!expanded && (
        <div className="bg-card/95 backdrop-blur-md border rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2 min-w-[140px]">
          <div
            onPointerDown={handlePointerDown}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>

          {/* Danger alert */}
          {dangerNearby ? (
            <div className="flex items-center gap-1.5 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-600">{formatDist(nearestDistance)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${
                heatIntensity === 'high' ? 'bg-red-500' :
                heatIntensity === 'medium' ? 'bg-amber-500' :
                heatIntensity === 'low' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <span className="text-xs font-medium text-muted-foreground">
                {nearbyBreakdown.total} nearby
              </span>
            </div>
          )}

          {totalSavings > 0 && (
            <div className="flex items-center gap-1 pl-2 border-l border-border">
              <Shield className="w-3 h-3 text-green-500" />
              <span className="text-xs font-bold text-green-600">${totalSavings}</span>
            </div>
          )}

          <button
            onClick={() => setExpanded(true)}
            className="ml-auto p-0.5 text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="bg-card/95 backdrop-blur-md border rounded-2xl shadow-2xl w-[200px] overflow-hidden">
          {/* Handle bar */}
          <div
            onPointerDown={handlePointerDown}
            className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing border-b bg-muted/30"
          >
            <div className="flex items-center gap-1.5">
              <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-heading font-semibold">Commute</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="p-0.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Danger banner */}
            {dangerNearby && (
              <div className="bg-red-100 border border-red-300 rounded-xl px-3 py-2 animate-pulse">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-700">Pothole Ahead!</span>
                </div>
                <p className="text-xs text-red-600 mt-0.5">
                  {dangerNearby.pothole?.severity || 'Unknown'} · {formatDist(nearestDistance)}
                </p>
              </div>
            )}

            {/* Nearest pothole */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Nearest</p>
              {nearestOverall ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: SEVERITY_COLORS[nearestOverall.severity] || '#f97316' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{nearestOverall.address || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {SEVERITY_LABELS[nearestOverall.severity]} · {formatDist(nearestOverall.distance)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No potholes nearby</p>
              )}
            </div>

            {/* Zone density */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Zone Density (500m)</p>
              <div className="flex items-center gap-1.5">
                {['dangerous', 'severe', 'moderate', 'minor'].map((sev) => {
                  const count = nearbyBreakdown[sev] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={sev}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: SEVERITY_COLORS[sev] }}
                    >
                      {count}
                    </div>
                  );
                })}
                {nearbyBreakdown.total === 0 && (
                  <span className="text-xs text-green-600 font-medium">Clear ✨</span>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1.5 pt-1 border-t">
              <button
                onClick={onToggleVoice}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isVoiceListening
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                <Navigation className="w-3 h-3" />
                {isVoiceListening ? 'On' : 'Off'}
              </button>
              <button
                onClick={onToggleMap}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-primary text-primary-foreground border border-primary"
              >
                <Map className="w-3 h-3" />
                Map
              </button>
            </div>

            {/* Savings */}
            {totalSavings > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
                <Shield className="w-3 h-3" />
                ${totalSavings} avoided · {formatDist(nearestOverall?.distance)} to nearest
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}