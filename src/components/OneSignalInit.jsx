import { useEffect } from 'react';

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'OneSignal' in window) {
      window.OneSignal.push(() => {
        window.OneSignal.init({
          appId: 'a73c79c5-208a-4442-9a29-fd347d4b3cdd',
          allowLocalhostAsSecureOrigin: true,
        });
      });
    }
  }, []);

  return null;
}