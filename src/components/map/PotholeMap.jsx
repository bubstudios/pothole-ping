import React, { Fragment, useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HotZoneLayer from '@/components/map/HotZoneLayer';

const severityColors = {
  minor: '#eab308',
  moderate: '#f97316',
  severe: '#ef4444',
  dangerous: '#b91c1c',
};

function createPotholeIcon(severity) {
  const color = severityColors[severity] || '#f97316';
  return L.divIcon({
    className: 'custom-pothole-marker',
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

const newPinIcon = L.divIcon({
  className: 'new-pin-marker',
  html: `<div style="
    width: 40px; height: 40px; border-radius: 50%;
    background: #f97316; border: 4px solid white;
    box-shadow: 0 0 0 4px rgba(249,115,22,0.3), 0 4px 12px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; animation: pulse 1.5s infinite;
  ">📍</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapClickHandler({ onMapClick, isDropping }) {
  const map = useMap();
  const isDroppingRef = useRef(isDropping);
  const onMapClickRef = useRef(onMapClick);

  // Keep refs in sync on every render
  useEffect(() => {
    isDroppingRef.current = isDropping;
    onMapClickRef.current = onMapClick;
  });

  // Attach directly to Leaflet map, bypassing react-leaflet event system
  useEffect(() => {
    const handler = (e) => {
      if (isDroppingRef.current) {
        // Ignore clicks on pothole markers or popups
        const target = e.originalEvent?.target;
        if (target?.closest?.('.leaflet-marker-icon') || target?.closest?.('.leaflet-popup')) {
          return;
        }
        onMapClickRef.current(e.latlng);
      }
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map]);

  return null;
}

function FlyToLocation({ center }) {
  const map = useMap();
  const lastCenter = useRef(null);
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      const key = `${center[0]},${center[1]}`;
      // Only fly if the center actually changed to a new location
      if (key !== lastCenter.current) {
        lastCenter.current = key;
        map.flyTo(center, 15, { duration: 1 });
      }
    }
  }, [center, map]);
  return null;
}


function FollowUserPosition({ position, enabled }) {
  const map = useMap();
  const lastMove = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (!position || isNaN(position.lat) || isNaN(position.lng)) return;

    const now = Date.now();
    if (now - lastMove.current > 2000) {
      lastMove.current = now;
      map.panTo([position.lat, position.lng], { animate: true, duration: 1.5 });
    }
  }, [position?.lat, position?.lng, map, enabled]);

  return null;
}

const voicePinIcon = L.divIcon({
  className: 'voice-pin-marker',
  html: `<div style="
    width: 44px; height: 44px; border-radius: 50%;
    background: #7c3aed; border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(124,58,237,0.35), 0 0 16px rgba(139,92,246,0.5), 0 4px 12px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    position: relative; animation: voicePulse 1.2s infinite;
  ">
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' style='position:relative;z-index:2;'>
      <path d='M13 2L5.5 14H11L10 22L18 9H12L13 2Z' fill='#fbbf24' stroke='#f59e0b' stroke-width='1.5' stroke-linejoin='round'/>
    </svg>
    <div style='position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:32px;height:8px;background:radial-gradient(ellipse,rgba(200,180,220,0.6),transparent);border-radius:50%;animation:smokeRise 2s infinite;'></div>
    <div style='position:absolute;top:-2px;left:60%;width:4px;height:4px;background:#b8a0d0;border-radius:50%;animation:debrisFly 1.5s infinite;'></div>
    <div style='position:absolute;top:2px;left:25%;width:3px;height:3px;background:#c4b0d8;border-radius:50%;animation:debrisFly 1.8s infinite 0.3s;'></div>
    <div style='position:absolute;top:-1px;left:55%;width:3px;height:3px;background:#d0bce4;border-radius:50%;animation:debrisFly 1.4s infinite 0.7s;'></div>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div style="
    width: 18px; height: 18px; border-radius: 50%;
    background: #3b82f6; border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function PotholeMap({
  potholes = [],
  onMapClick,
  newPin,
  isDropping,
  onPotholeClick,
  onNewPinClick,
  onVoicePinClick,
  onVoicePinDelete,
  flyToCenter,
  userPosition,
  followUser = true,
  onToggleFollow,
  sidebarOpen = false,
  pendingVoicePins = [],
  hotZonesEnabled = false,
  children,
}) {
  const defaultCenter = [38.7, -90.3]; // STL area

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="w-full h-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler onMapClick={onMapClick} isDropping={isDropping} />

        {flyToCenter && <FlyToLocation center={flyToCenter} />}
        <FollowUserPosition position={userPosition} enabled={followUser} />

        <Fragment>
          {potholes.filter(p => !isNaN(p.latitude) && !isNaN(p.longitude)).map((p) => (
            <Marker
              key={p.id}
              position={[Number(p.latitude), Number(p.longitude)]}
              icon={createPotholeIcon(p.severity)}
              eventHandlers={{ click: () => onPotholeClick?.(p) }}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-semibold">{p.address || 'Unknown location'}</p>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {p.severity} · {p.status}
                  </p>
                  {p.jurisdiction_name && (
                    <p className="text-xs mt-1">📞 {p.jurisdiction_name}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </Fragment>

        {newPin && (
          <Marker
            position={[newPin.lat, newPin.lng]}
            icon={newPinIcon}
            eventHandlers={{ click: () => onNewPinClick?.() }}
          />
        )}

        {pendingVoicePins.filter(p => !isNaN(p.lat) && !isNaN(p.lng)).map((pin, i) => (
          <Marker
            key={`voice-${pin.lat}-${pin.lng}-${i}`}
            position={[pin.lat, pin.lng]}
            icon={voicePinIcon}
          >
            <Popup>
              <div className="text-sm space-y-2 min-w-[140px]">
                <p className="font-semibold text-xs">Voice-dropped pin</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onVoicePinClick?.(pin)}
                    className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
                  >
                    Report
                  </button>
                  <button
                    onClick={() => onVoicePinDelete?.(pin)}
                    className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {userPosition && (
          <Marker
            position={[userPosition.lat, userPosition.lng]}
            icon={userLocationIcon}
          />
        )}
        <HotZoneLayer potholes={potholes} enabled={hotZonesEnabled} />
        {children}
      </MapContainer>

      {/* Follow-me toggle */}
      {!sidebarOpen && userPosition && onToggleFollow && (
        <button
          onClick={onToggleFollow}
          aria-label={followUser ? 'Stop following my location' : 'Follow my location'}
          className="absolute bottom-20 left-4 z-[1000] bg-card border shadow-lg rounded-full w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors"
          title={followUser ? 'Stop following my location' : 'Follow my location'}
        >
          <span style={{ fontSize: 18 }}>{followUser ? '📍' : '🧭'}</span>
        </button>
      )}

      {isDropping && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg font-heading font-semibold text-sm animate-bounce">
          👆 Tap the map to drop a pin
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 4px rgba(124,58,237,0.35), 0 0 16px rgba(139,92,246,0.5); }
          50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(124,58,237,0.15), 0 0 24px rgba(139,92,246,0.7); }
        }
        @keyframes smokeRise {
          0% { opacity: 0.6; transform: translateX(-50%) translateY(0) scaleX(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-12px) scaleX(1.8); }
        }
        @keyframes debrisFly {
          0% { opacity: 0.8; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(6px, -14px); }
        }
      `}</style>
    </div>
  );
}