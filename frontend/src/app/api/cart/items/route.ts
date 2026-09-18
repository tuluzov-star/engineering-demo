import { NextRequest, NextResponse } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
import { readJsonObject, RequestBodyError } from '@/lib/request-json';
import {
  checkRateLimit,
  rateLimitHeaders,
  requestRateLimitKey,
} from '@/lib/rate-limit';
import {
  CART_TOKEN_COOKIE,
  getOrCreateCartToken,
  persistCartToken,
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

const CART_MUTATION_POLICY = {
  limit: 40,
  windowMs: 60_000,
} as const;

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(
    requestRateLimitKey(request, 'cart-mutation'),
    CART_MUTATION_POLICY,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        code: 'engineering_demo_rate_limited',
        message: 'Too many cart changes. Please retry shortly.',
      },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await readJsonObject(request, 2 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status, headers: rateLimitHeaders(rateLimit) },
      );
    }

    throw error;
  }

  const id = Number(payload.id);
  const quantity = Number(payload.quantity ?? 1);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_cart_item',
        message: 'A valid product ID and quantity between 1 and 99 are required.',
      },
      { status: 400, headers: rateLimitHeaders(rateLimit) },
    );
  }

  try {
    const session = await getOrCreateCartToken(request.cookies.get(CART_TOKEN_COOKIE)?.value);
    const result = await storeApiRequest<StoreApiCart>(
      '/cart/add-item',
      {
        method: 'POST',
        body: JSON.stringify({ id, quantity }),
      },
      session.token,
    );

    if (!result.ok) {
      return NextResponse.json(publicStoreApiError(result.data as StoreApiError), {
        status: result.status,
        headers: rateLimitHeaders(rateLimit),
      });
    }

    const response = NextResponse.json(result.data, {
      headers: rateLimitHeaders(rateLimit),
    });
    persistCartToken(response, result.cartToken ?? session.token);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        code: 'engineering_demo_cart_add_failed',
        message: error instanceof Error ? error.message : 'Could not add the product to the cart.',
      },
      { status: 503, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
