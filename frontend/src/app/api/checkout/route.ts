import { NextRequest } from 'next/server';
import type {
  CheckoutPayload,
  StoreApiCheckoutResponse,
  StoreApiError,
} from '@/lib/store-api';
import { validateCheckoutInput } from '@/lib/checkout-validation';
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
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

const CHECKOUT_POLICY = {
  limit: 8,
  windowMs: 10 * 60_000,
} as const;

export async function POST(request: NextRequest) {
  const context = createRequestContext(request, '/api/checkout');
  const rateLimit = checkRateLimit(
    requestRateLimitKey(request, 'checkout'),
    CHECKOUT_POLICY,
  );

  if (!rateLimit.allowed) {
    return observedJson(
      context,
      {
        code: 'engineering_demo_rate_limited',
        message: 'Too many checkout attempts. Please retry later.',
      },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'rate_limited',
        errorCode: 'engineering_demo_rate_limited',
      },
    );
  }

  let input: Record<string, unknown>;

  try {
    input = await readJsonObject(request, 12 * 1024);
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

  const validation = validateCheckoutInput(input);

  if (!validation.ok) {
    return observedJson(
      context,
      {
        code: validation.code,
        message: validation.message,
      },
      {
        status: 400,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'client_error',
        errorCode: validation.code,
      },
    );
  }

  const { billingAddress, customerNote } = validation;

  const payload: CheckoutPayload = {
    billing_address: billingAddress,
    shipping_address: {
      first_name: billingAddress.first_name,
      last_name: billingAddress.last_name,
      company: billingAddress.company,
      address_1: billingAddress.address_1,
      address_2: billingAddress.address_2,
      city: billingAddress.city,
      state: billingAddress.state,
      postcode: billingAddress.postcode,
      country: billingAddress.country,
    },
    payment_method: 'cheque',
    payment_data: [],
    customer_note: customerNote,
  };

  try {
    const session = await getOrCreateCartToken(request.cookies.get(CART_TOKEN_COOKIE)?.value);

    if (session.cart.items_count < 1) {
      return observedJson(
        context,
        {
          code: 'engineering_demo_empty_cart',
          message: 'Add at least one product before checkout.',
        },
        {
          status: 409,
          headers: rateLimitHeaders(rateLimit),
          outcome: 'client_error',
          errorCode: 'engineering_demo_empty_cart',
        },
      );
    }

    payload.expected_total = session.cart.totals.total_price;

    const result = await storeApiRequest<StoreApiCheckoutResponse>(
      '/checkout',
      {
        method: 'POST',
        body: JSON.stringify(payload),
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
    response.cookies.delete(CART_TOKEN_COOKIE);
    return response;
  } catch {
    return observedJson(
      context,
      {
        code: 'engineering_demo_checkout_failed',
        message: 'Checkout could not be completed.',
      },
      {
        status: 503,
        headers: rateLimitHeaders(rateLimit),
        outcome: 'unavailable',
        errorCode: 'engineering_demo_checkout_failed',
      },
    );
  }
}
