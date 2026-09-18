import { NextRequest, NextResponse } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  const payload = (await request.json()) as { quantity?: unknown };
  const quantity = Number(payload.quantity);

  if (!key || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_cart_update',
        message: 'A cart item key and quantity between 1 and 99 are required.',
      },
      { status: 400 },
    );
  }

  return mutateCart(request, '/cart/update-item', { key, quantity });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { key } = await context.params;

  if (!key) {
    return NextResponse.json(
      {
        code: 'engineering_demo_invalid_cart_remove',
        message: 'A cart item key is required.',
      },
      { status: 400 },
    );
  }

  return mutateCart(request, '/cart/remove-item', { key });
}

async function mutateCart(
  request: NextRequest,
  endpoint: '/cart/update-item' | '/cart/remove-item',
  payload: Record<string, string | number>,
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
      });
    }

    const response = NextResponse.json(result.data);
    persistCartToken(response, result.cartToken ?? session.token);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        code: 'engineering_demo_cart_mutation_failed',
        message: error instanceof Error ? error.message : 'Could not update the cart.',
      },
      { status: 503 },
    );
  }
}
