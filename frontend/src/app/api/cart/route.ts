import { NextRequest } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
import { createRequestContext, observedJson } from '@/lib/observability';
import {
  CART_TOKEN_COOKIE,
  getOrCreateCartToken,
  persistCartToken,
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = createRequestContext(request, '/api/cart');
  const existingToken = request.cookies.get(CART_TOKEN_COOKIE)?.value ?? null;

  try {
    const session = await getOrCreateCartToken(existingToken);
    const response = observedJson(context, session.cart, { outcome: 'success' });
    persistCartToken(response, session.token);
    return response;
  } catch (error) {
    const fallback = existingToken
      ? await storeApiRequest<StoreApiCart>('/cart', { method: 'GET' })
      : null;

    if (fallback?.ok && fallback.cartToken) {
      const response = observedJson(context, fallback.data, {
        outcome: 'success',
        upstreamStatus: fallback.status,
      });
      persistCartToken(response, fallback.cartToken);
      return response;
    }

    const storeError = fallback?.data as StoreApiError | undefined;
    const code = storeError?.code || 'engineering_demo_cart_unavailable';

    return observedJson(
      context,
      storeError
        ? publicStoreApiError(storeError)
        : {
            code,
            message: error instanceof Error ? error.message : 'Cart is unavailable.',
          },
      {
        status: fallback?.status ?? 503,
        outcome: fallback ? 'upstream_error' : 'unavailable',
        errorCode: code,
        upstreamStatus: fallback?.status,
      },
    );
  }
}
