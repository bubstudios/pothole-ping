import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

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

const STOP_THRESHOLD_METERS = 20;
const STOP_DURATION_MS = 5 * 60 * 1000;
const MIN_TRAVEL_METERS = 200;

function pinKey(pin) {
  return `${pin.lat}-${pin.lng}`;
}

export default function DelayedReportPrompt({ pendingPins, onPrompt }) {
  const [isWatching, setIsWatching] = useState(false);
  const stationarySince = useRef({});        // key → timestamp
  const lastPosition = useRef(null);
  const watchId = useRef(null);
  const furthestFromPin = useRef({});         // key → max meters traveled
  const triggeredPins = useRef(new Set());    // keys already triggered

  // Start/stop GPS watch based on whether we have pending pins
  useEffect(() => {
    if (!pendingPins || pendingPins.length === 0) {
      stopWatching();
      triggeredPins.current.clear();
      return;
    }

    // Any untriggered pins?
    const allKeys = pendingPins.map(pinKey);
    const hasUntriggered = allKeys.some((k) => !triggeredPins.current.has(k));
    if (!hasUntriggered) return;

    startWatching();
  }, [pendingPins]);

  // Clean up removed pins from tracking
  useEffect(() => {
    const currentKeys = new Set((pendingPins || []).map(pinKey));
    // Remove triggered entries for pins no longer in the list
    for (const k of triggeredPins.current) {
      if (!currentKeys.has(k)) triggeredPins.current.delete(k);
    }
    for (const k of Object.keys(furthestFromPin.current)) {
      if (!currentKeys.has(k)) delete furthestFromPin.current[k];
    }
    for (const k of Object.keys(stationarySince.current)) {
      if (!currentKeys.has(k)) delete stationarySince.current[k];
    }
  }, [pendingPins]);

  const startWatching = () => {
    if (!navigator.geolocation) return;
    setIsWatching(true);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Update furthest distance from each untriggered pin
        if (pendingPins) {
          for (const pin of pendingPins) {
            const k = pinKey(pin);
            if (triggeredPins.current.has(k)) continue;
            const dist = haversineMeters(pin.lat, pin.lng, loc.lat, loc.lng);
            if (dist > (furthestFromPin.current[k] || 0)) {
              furthestFromPin.current[k] = dist;
            }
          }
        }

        if (lastPosition.current) {
          const moved = haversineMeters(
            lastPosition.current.lat, lastPosition.current.lng,
            loc.lat, loc.lng
          );

          if (moved < STOP_THRESHOLD_METERS) {
            // Stationary — check each untriggered pin
            if (pendingPins) {
              for (const pin of pendingPins) {
                const k = pinKey(pin);
                if (triggeredPins.current.has(k)) continue;

                if ((furthestFromPin.current[k] || 0) < MIN_TRAVEL_METERS) {
                  // Still near the pothole — reset this pin's stationary timer
                  stationarySince.current[k] = null;
                } else if (!stationarySince.current[k]) {
                  stationarySince.current[k] = Date.now();
                } else if (Date.now() - stationarySince.current[k] >= STOP_DURATION_MS) {
                  triggeredPins.current.add(k);
                  const minutesAgo = Math.round((Date.now() - (pin.time || Date.now())) / 60000);
                  toast('Forgot something?', {
                    description: `You flagged a pothole ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago. Tap to add details before you forget.`,
                    action: {
                      label: 'Add Details',
                      onClick: () => onPrompt?.(pin),
                    },
                    duration: 15000,
                  });
                }
              }
            }
          } else {
            // Moving — reset stationary timers
            if (pendingPins) {
              for (const pin of pendingPins) {
                stationarySince.current[pinKey(pin)] = null;
              }
            }
          }
        }

        lastPosition.current = loc;

        // If all pins triggered, stop watching
        const allKeys = pendingPins ? pendingPins.map(pinKey) : [];
        if (allKeys.every((k) => triggeredPins.current.has(k))) {
          stopWatching();
        }
      },
      () => {
        stopWatching();
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 }
    );

    watchId.current = id;
  };

  const stopWatching = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsWatching(false);
    stationarySince.current = {};
    lastPosition.current = null;
  };

  useEffect(() => {
    return () => stopWatching();
  }, []);

  return null;
}