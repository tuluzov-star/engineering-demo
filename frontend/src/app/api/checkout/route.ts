import { NextRequest, NextResponse } from 'next/server';
import type {
  CheckoutPayload,
  StoreApiCheckoutResponse,
  StoreApiError,
} from '@/lib/store-api';
import { validateCheckoutInput } from '@/lib/checkout-validation';
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
  const rateLimit = checkRateLimit(
    requestRateLimitKey(request, 'checkout'),
    CHECKOUT_POLICY,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        code: 'engineering_demo_rate_limited',
        message: 'Too many checkout attempts. Please retry later.',
      },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  let input: Record<string, unknown>;

  try {
    input = await readJsonObject(request, 12 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status, headers: rateLimitHeaders(rateLimit) },
      );
    }

    throw error;
  }

  const validation = validateCheckoutInput(input);

  if (!validation.ok) {
    return NextResponse.json(
      {
        code: validation.code,
        message: validation.message,
      },
      { status: 400, headers: rateLimitHeaders(rateLimit) },
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
      return NextResponse.json(
        {
          code: 'engineering_demo_empty_cart',
          message: 'Add at least one product before checkout.',
        },
        { status: 409, headers: rateLimitHeaders(rateLimit) },
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
      return NextResponse.json(publicStoreApiError(result.data as StoreApiError), {
        status: result.status,
        headers: rateLimitHeaders(rateLimit),
      });
    }

    const response = NextResponse.json(result.data, {
      headers: rateLimitHeaders(rateLimit),
    });
    response.cookies.delete(CART_TOKEN_COOKIE);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        code: 'engineering_demo_checkout_failed',
        message: error instanceof Error ? error.message : 'Checkout could not be completed.',
      },
      { status: 503, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
