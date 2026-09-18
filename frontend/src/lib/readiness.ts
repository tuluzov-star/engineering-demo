import 'server-only';

import type { BackendHealth } from './wordpress';
import { getBackendReadiness, getStoreApiReadiness } from './wordpress';

export type ApplicationReadiness = {
  ready: boolean;
  backend: BackendHealth | null;
  checks: {
    backend: boolean;
    store_api: boolean;
  };
};

export async function getApplicationReadiness(): Promise<ApplicationReadiness> {
  const [backendResult, storeApiResult] = await Promise.allSettled([
    getBackendReadiness(),
    getStoreApiReadiness(),
  ]);

  const backend =
    backendResult.status === 'fulfilled' ? backendResult.value : null;
  const backendReady =
    backend !== null &&
    backend.status === 'ready' &&
    backend.checks?.database === true &&
    backend.checks?.woocommerce === true &&
    backend.checks?.hpos === true;
  const storeApiReady =
    storeApiResult.status === 'fulfilled' && storeApiResult.value;

  return {
    ready: backendReady && storeApiReady,
    backend,
    checks: {
      backend: backendReady,
      store_api: storeApiReady,
    },
  };
}
