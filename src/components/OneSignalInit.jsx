import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function OneSignalInit() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: 'a73c79c5-208a-4442-9a29-fd347d4b3cdd',
          allowLocalhostAsSecureOrigin: true,
        });
      } catch (e) {
        // init can throw if called twice during hot-reload; ignore
      }

      // --- Capture the player ID and store it on the user's reputation row ---
      const storePlayerId = async () => {
        try {
          const playerId = OneSignal.User.PushSubscription.id;
          if (!playerId) return;
          const me = await base44.auth.me();
          if (!me) return;
          const reps = await base44.entities.UserReputation.filter({ created_by_id: me.id });
          if (reps[0] && reps[0].onesignal_player_id !== playerId) {
            await base44.entities.UserReputation.update(reps[0].id, { onesignal_player_id: playerId });
          }
        } catch (e) {}
      };

      // Store now (in case already subscribed) and again whenever the subscription changes
      storePlayerId();
      try {
        OneSignal.User.PushSubscription.addEventListener('change', storePlayerId);
      } catch (e) {}

      // --- Handle notification clicks: deep-link to the pothole, SPA-style ---
      try {
        OneSignal.Notifications.addEventListener('click', (event) => {
          const potholeId = event.notification.additionalData.potholeId;

          if (potholeId) {
            navigate(`/pothole/${potholeId}`);
          }
        });
      } catch (e) {}
    });

    // --- Expose a helper to prompt for push after the user submits their first report ---
    window.__promptPush = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push((OneSignal) => OneSignal.Slidedown.promptPush().catch(() => {}));
    };
  }, [navigate]);

  return null;
}