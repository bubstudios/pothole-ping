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
const STOP_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export default function DelayedReportPrompt({ pendingPin, onPrompt }) {
  const [isWatching, setIsWatching] = useState(false);
  const stationarySince = useRef(null);
  const lastPosition = useRef(null);
  const watchId = useRef(null);
  const triggered = useRef(false);

  // Start watching when a pending pin appears
  useEffect(() => {
    if (!pendingPin) {
      // Cleanup if pin was cleared
      stopWatching();
      triggered.current = false;
      return;
    }

    if (triggered.current) return;
    startWatching();
  }, [pendingPin?.lat, pendingPin?.lng]);

  const startWatching = () => {
    if (!navigator.geolocation) return;
    setIsWatching(true);
    stationarySince.current = null;
    lastPosition.current = null;
    triggered.current = false;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (lastPosition.current) {
          const moved = haversineMeters(
            lastPosition.current.lat, lastPosition.current.lng,
            loc.lat, loc.lng
          );

          if (moved < STOP_THRESHOLD_METERS) {
            // Staying still — start the clock if not already ticking
            if (!stationarySince.current) {
              stationarySince.current = Date.now();
            } else if (Date.now() - stationarySince.current >= STOP_DURATION_MS) {
              // Stopped for 2+ minutes — trigger prompt
              triggered.current = true;
              stopWatching();
              const minutesAgo = Math.round((Date.now() - (pendingPin?.time || Date.now())) / 60000);
              toast('Forgot something?', {
                description: `You flagged a pothole ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago. Tap to add details before you forget.`,
                action: {
                  label: 'Add Details',
                  onClick: () => onPrompt?.(pendingPin),
                },
                duration: 15000,
              });
            }
          } else {
            // Moved significantly — reset the clock
            stationarySince.current = null;
          }
        }

        lastPosition.current = loc;
      },
      () => {
        // GPS error — silently stop
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
    stationarySince.current = null;
    lastPosition.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWatching();
  }, []);

  // This component renders nothing — it just monitors and fires callbacks
  return null;
}