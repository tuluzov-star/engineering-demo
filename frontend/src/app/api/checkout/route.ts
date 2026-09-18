import { NextRequest, NextResponse } from 'next/server';
import type {
  CheckoutAddress,
  CheckoutPayload,
  StoreApiCheckoutResponse,
  StoreApiError,
} from '@/lib/store-api';
import {
  CART_TOKEN_COOKIE,
  getOrCreateCartToken,
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

const REQUIRED_ADDRESS_FIELDS: Array<keyof CheckoutAddress> = [
  'first_name',
  'last_name',
  'address_1',
  'city',
  'postcode',
  'country',
  'email',
];

export async function POST(request: NextRequest) {
  const input = (await request.json()) as Partial<CheckoutAddress> & { customer_note?: unknown };
  const billingAddress = normalizeAddress(input);

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!billingAddress[field]) {
      return NextResponse.json(
        {
          code: 'engineering_demo_invalid_checkout',
          message: `Checkout field ${field} is required.`,
        },
        { status: 400 },
      );
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(billingAddress.email)) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_email',
        message: 'A valid email address is required.',
      },
      { status: 400 },
    );
  }

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
    customer_note: cleanText(input.customer_note, 500),
  };

  try {
    const session = await getOrCreateCartToken(request.cookies.get(CART_TOKEN_COOKIE)?.value);

    if (session.cart.items_count < 1) {
      return NextResponse.json(
        {
          code: 'engineering_demo_empty_cart',
          message: 'Add at least one product before checkout.',
        },
        { status: 409 },
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
      });
    }

    const response = NextResponse.json(result.data);
    response.cookies.delete(CART_TOKEN_COOKIE);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        code: 'engineering_demo_checkout_failed',
        message: error instanceof Error ? error.message : 'Checkout could not be completed.',
      },
      { status: 503 },
    );
  }
}

function normalizeAddress(input: Partial<CheckoutAddress>): CheckoutAddress {
  return {
    first_name: cleanText(input.first_name, 80),
    last_name: cleanText(input.last_name, 80),
    company: cleanText(input.company, 120),
    address_1: cleanText(input.address_1, 160),
    address_2: cleanText(input.address_2, 160),
    city: cleanText(input.city, 120),
    state: cleanText(input.state, 80),
    postcode: cleanText(input.postcode, 32),
    country: cleanText(input.country, 2).toUpperCase(),
    email: cleanText(input.email, 160),
    phone: cleanText(input.phone, 40),
  };
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}
