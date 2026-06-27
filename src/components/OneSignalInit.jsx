import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'OneSignal' in window) {
      window.OneSignal.push(async () => {
        await window.OneSignal.init({
          appId: 'a73c79c5-208a-4442-9a29-fd347d4b3cdd',
          allowLocalhostAsSecureOrigin: true,
        });
        // Store player ID on user's reputation record for push notifications
        try {
          const playerId = await window.OneSignal.getUserId();
          if (playerId) {
            const me = await base44.auth.me();
            if (me) {
              const reps = await base44.entities.UserReputation.filter({ created_by_id: me.id });
              if (reps[0] && reps[0].onesignal_player_id !== playerId) {
                await base44.entities.UserReputation.update(reps[0].id, { onesignal_player_id: playerId });
              }
            }
          }
        } catch (e) {}
        // Handle notification clicks — deep-link to pothole detail
        window.OneSignal.on('notificationClick', (e) => {
          if (e?.data?.potholeId) {
            window.location.href = `/pothole/${e.data.potholeId}`;
          }
        });
      });
    }
  }, []);

  return null;
}