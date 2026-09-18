import { NextRequest, NextResponse } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
import {
  CART_TOKEN_COOKIE,
  getOrCreateCartToken,
  persistCartToken,
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const existingToken = request.cookies.get(CART_TOKEN_COOKIE)?.value ?? null;

  try {
    const session = await getOrCreateCartToken(existingToken);
    const response = NextResponse.json(session.cart);
    persistCartToken(response, session.token);
    return response;
  } catch (error) {
    const fallback = existingToken
      ? await storeApiRequest<StoreApiCart>('/cart', { method: 'GET' })
      : null;

    if (fallback?.ok && fallback.cartToken) {
      const response = NextResponse.json(fallback.data);
      persistCartToken(response, fallback.cartToken);
      return response;
    }

    const storeError = fallback?.data as StoreApiError | undefined;

    return NextResponse.json(
      storeError
        ? publicStoreApiError(storeError)
        : {
            code: 'engineering_demo_cart_unavailable',
            message: error instanceof Error ? error.message : 'Cart is unavailable.',
          },
      { status: fallback?.status ?? 503 },
    );
  }
}
