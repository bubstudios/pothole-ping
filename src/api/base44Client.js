import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

console.log('[base44Client] appParams:', { appId, hasToken: !!token, functionsVersion, appBaseUrl });

let clientInstance = null;

//Create a client with authentication required
try {
  clientInstance = createClient({
    appId: appId || 'unknown',
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl,
  });
} catch (e) {
  console.error('[base44Client] createClient failed:', e);
  clientInstance = { auth: { me: () => Promise.reject(e) }, entities: {}, integrations: {} };
}

export const base44 = clientInstance;