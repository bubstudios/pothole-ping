import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, Navigation } from 'lucide-react';
import { toast } from 'sonner';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ProximityAlert({ potholes = [], isActive, onToggle, onLocationChange, onDangerNearby, onAvoidance }) {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestDistance, setNearestDistance] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const alertedIds = useRef(new Set());
  const liveRegionRef = useRef(null);

  // Prune alert history when potholes are removed — but keep existing IDs
  // so driving past the same pothole doesn't re-trigger avoidance recordings
  useEffect(() => {
    const currentIds = new Set(potholes.map((p) => p.id));
    for (const id of alertedIds.current) {
      if (!currentIds.has(id)) alertedIds.current.delete(id);
    }
  }, [potholes]);

  // Start/stop watching position
  useEffect(() => {
    if (!isActive) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setUserLocation(null);
      setNearestDistance(null);
      setGeoError(null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };
        setUserLocation(loc);
        onLocationChange?.(loc);
        setGeoError(null);
      },
      (err) => {
        setGeoError('Location access denied. Please enable GPS.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    setWatchId(id);
    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [isActive]);

  // Calculate nearest pothole and alert when close
  useEffect(() => {
    if (!userLocation || !potholes.length) {
      setNearestDistance(null);
      return;
    }

    let minDist = Infinity;
    let nearest = null;

    for (const p of potholes) {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, p.latitude, p.longitude);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }

    setNearestDistance(minDist);

    // Danger zone: within 100m of any pothole
    onDangerNearby?.(minDist < 100 ? { pothole: nearest, distance: minDist } : null);

    // Alert if within 100 meters and not already alerted for this pothole
    if (nearest && minDist < 100 && !alertedIds.current.has(nearest.id)) {
      alertedIds.current.add(nearest.id);
      const feet = Math.round(minDist * 3.28084);
      const alertMsg = `A ${nearest.severity} pothole is ${feet}ft ahead at ${nearest.address || 'unknown location'}. Drive carefully!`;
      toast.warning('Pothole Nearby!', {
        description: alertMsg,
        duration: 8000,
      });
      if (liveRegionRef.current) liveRegionRef.current.textContent = `Pothole nearby! ${alertMsg}`;
      onAvoidance?.(nearest, minDist);
    }

    // Clean up IDs for potholes no longer in list
    const currentIds = new Set(potholes.map((p) => p.id));
    for (const id of alertedIds.current) {
      if (!currentIds.has(id)) alertedIds.current.delete(id);
    }
  }, [userLocation, potholes]);

  // US units: convert meters to feet/miles
  const formatDistance = (meters) => {
    if (meters == null) return null;
    const feet = meters * 3.28084;
    if (feet < 528) return `${Math.round(feet)}ft`;
    return `${(feet / 5280).toFixed(1)}mi`;
  };

  return (
    <div className="flex items-center gap-2">
      <div aria-live="assertive" aria-atomic="true" className="sr-only" ref={liveRegionRef} />
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          isActive
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'text-muted-foreground border-border hover:bg-muted'
        }`}
        title={isActive ? 'Proximity alerts active' : 'Enable proximity alerts'}
        aria-label={isActive ? 'Proximity alerts active' : 'Enable proximity alerts'}
      >
        {isActive ? (
          <Bell className="w-3.5 h-3.5" />
        ) : (
          <BellOff className="w-3.5 h-3.5" />
        )}
        {isActive && nearestDistance != null && (
          <span className="font-mono text-blue-600">
            {formatDistance(nearestDistance)}
          </span>
        )}
      </button>

      {isActive && geoError && (
        <span className="text-xs text-red-500 hidden sm:inline">{geoError}</span>
      )}

      {isActive && !userLocation && !geoError && (
        <span className="text-xs text-muted-foreground hidden sm:inline animate-pulse">
          Getting location...
        </span>
      )}
    </div>
  );
}