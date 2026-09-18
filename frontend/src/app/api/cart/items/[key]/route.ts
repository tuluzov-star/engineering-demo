import { NextRequest, NextResponse } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
import { readJsonObject, RequestBodyError } from '@/lib/request-json';
import {
  checkRateLimit,
  rateLimitHeaders,
  requestRateLimitKey,
  type RateLimitResult,
} from '@/lib/rate-limit';
import {
  CART_TOKEN_COOKIE,
  getOrCreateCartToken,
  persistCartToken,
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

type RouteContext = {
  params: Promise<{ key: string }>;
};

const CART_MUTATION_POLICY = {
  limit: 40,
  windowMs: 60_000,
} as const;

export async function PATCH(request: NextRequest, context: RouteContext) {
  const rateLimit = checkRateLimit(
    requestRateLimitKey(request, 'cart-mutation'),
    CART_MUTATION_POLICY,
  );

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit);
  }

  const { key } = await context.params;
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

  const quantity = Number(payload.quantity);

  if (!key || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_cart_update',
        message: 'A cart item key and quantity between 1 and 99 are required.',
      },
      { status: 400, headers: rateLimitHeaders(rateLimit) },
    );
  }

  return mutateCart(request, '/cart/update-item', { key, quantity }, rateLimit);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimit = checkRateLimit(
    requestRateLimitKey(request, 'cart-mutation'),
    CART_MUTATION_POLICY,
  );

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit);
  }

  const { key } = await context.params;

  if (!key) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_cart_remove',
        message: 'A cart item key is required.',
      },
      { status: 400, headers: rateLimitHeaders(rateLimit) },
    );
  }

  return mutateCart(request, '/cart/remove-item', { key }, rateLimit);
}

async function mutateCart(
  request: NextRequest,
  endpoint: '/cart/update-item' | '/cart/remove-item',
  payload: Record<string, string | number>,
  rateLimit: RateLimitResult,
) {
  try {
    const session = await getOrCreateCartToken(request.cookies.get(CART_TOKEN_COOKIE)?.value);
    const result = await storeApiRequest<StoreApiCart>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(payload),
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
        code: 'engineering_demo_cart_mutation_failed',
        message: error instanceof Error ? error.message : 'Could not update the cart.',
      },
      { status: 503, headers: rateLimitHeaders(rateLimit) },
    );
  }
}

function rateLimitedResponse(rateLimit: RateLimitResult) {
  return NextResponse.json(
    {
      code: 'engineering_demo_rate_limited',
      message: 'Too many cart changes. Please retry shortly.',
    },
    { status: 429, headers: rateLimitHeaders(rateLimit) },
  );
}
