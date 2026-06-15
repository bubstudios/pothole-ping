import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 1 });
    }
  }, [center, map]);
  return null;
}

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
  flyToCenter,
  userPosition,
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} isDropping={isDropping} />
        {flyToCenter && <FlyToLocation center={flyToCenter} />}

        {potholes.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
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

        {newPin && (
          <Marker
            position={[newPin.lat, newPin.lng]}
            icon={newPinIcon}
            eventHandlers={{ click: () => onNewPinClick?.() }}
          />
        )}

        {userPosition && (
          <Marker
            position={[userPosition.lat, userPosition.lng]}
            icon={userLocationIcon}
          />
        )}
        {children}
      </MapContainer>

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
      `}</style>
    </div>
  );
}