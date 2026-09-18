import { NextRequest } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
import { createRequestContext, observedJson } from '@/lib/observability';
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
  const context = createRequestContext(request, '/api/cart/items');
  const rateLimit = checkRateLimit(
    requestRateLimitKey(request, 'cart-mutation'),
    CART_MUTATION_POLICY,
  );

  if (!rateLimit.allowed) {
    return observedJson(
      context,
      {
        code: 'engineering_demo_rate_limited',
        message: 'Too many cart changes. Please retry shortly.',
      },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'rate_limited',
        errorCode: 'engineering_demo_rate_limited',
      },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await readJsonObject(request, 2 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return observedJson(
        context,
        { code: error.code, message: error.message },
        {
          status: error.status,
          headers: rateLimitHeaders(rateLimit),
          outcome: 'client_error',
          errorCode: error.code,
        },
      );
    }

    throw error;
  }

  const id = Number(payload.id);
  const quantity = Number(payload.quantity ?? 1);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return observedJson(
      context,
      {
        code: 'engineering_demo_invalid_cart_item',
        message: 'A valid product ID and quantity between 1 and 99 are required.',
      },
      {
        status: 400,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'client_error',
        errorCode: 'engineering_demo_invalid_cart_item',
      },
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
      const storeError = result.data as StoreApiError;

      return observedJson(context, publicStoreApiError(storeError), {
        status: result.status,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'upstream_error',
        errorCode: storeError.code,
        upstreamStatus: result.status,
      });
    }

    const response = observedJson(context, result.data, {
      headers: rateLimitHeaders(rateLimit),
      outcome: 'success',
      upstreamStatus: result.status,
    });
    persistCartToken(response, result.cartToken ?? session.token);
    return response;
  } catch {
    return observedJson(
      context,
      {
        code: 'engineering_demo_cart_add_failed',
        message: 'Could not add the product to the cart.',
      },
      {
        status: 503,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'unavailable',
        errorCode: 'engineering_demo_cart_add_failed',
      },
    );
  }
}
