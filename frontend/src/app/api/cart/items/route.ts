import { NextRequest, NextResponse } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
import {
  CART_TOKEN_COOKIE,
  getOrCreateCartToken,
  persistCartToken,
  publicStoreApiError,
  storeApiRequest,
} from '@/lib/store-api-server';

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { id?: unknown; quantity?: unknown };
  const id = Number(payload.id);
  const quantity = Number(payload.quantity ?? 1);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_cart_item',
        message: 'A valid product ID and quantity between 1 and 99 are required.',
      },
      { status: 400 },
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
      });
    }

    const response = NextResponse.json(result.data);
    persistCartToken(response, result.cartToken ?? session.token);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        code: 'engineering_demo_cart_add_failed',
        message: error instanceof Error ? error.message : 'Could not add the product to the cart.',
      },
      { status: 503 },
    );
  }
}
