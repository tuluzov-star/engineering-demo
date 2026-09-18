import 'server-only';

import type { NextResponse } from 'next/server';
import type { StoreApiCart, StoreApiError } from '@/lib/store-api';

export const CART_TOKEN_COOKIE = 'wc_cart_token';
const CART_TOKEN_HEADER = 'Cart-Token';

const internalWordPressUrl =
  process.env.WORDPRESS_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_WORDPRESS_URL ??
  'http://localhost:8080';

export type StoreApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | StoreApiError;
  cartToken: string | null;
};

export async function storeApiRequest<T>(
  path: string,
  init: RequestInit = {},
  cartToken?: string | null,
): Promise<StoreApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (cartToken) {
    headers.set(CART_TOKEN_HEADER, cartToken);
  }

  const response = await fetch(`${internalWordPressUrl}/wp-json/wc/store/v1${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  let data: T | StoreApiError;

  try {
    data = (await response.json()) as T | StoreApiError;
  } catch {
    data = {
      code: 'engineering_demo_invalid_store_api_response',
      message: 'WooCommerce returned a response that could not be parsed.',
      data: { status: response.status },
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    cartToken: response.headers.get(CART_TOKEN_HEADER),
  };
}

export async function getOrCreateCartToken(currentToken?: string | null): Promise<{
  token: string;
  cart: StoreApiCart;
}> {
  if (currentToken) {
    const current = await storeApiRequest<StoreApiCart>('/cart', { method: 'GET' }, currentToken);

    if (current.ok) {
      return {
        token: current.cartToken ?? currentToken,
        cart: current.data as StoreApiCart,
      };
    }
  }

  const fresh = await storeApiRequest<StoreApiCart>('/cart', { method: 'GET' });

  if (!fresh.ok || !fresh.cartToken) {
    const error = fresh.data as StoreApiError;
    throw new Error(error.message || 'WooCommerce did not provide a Cart-Token.');
  }

  return {
    token: fresh.cartToken,
    cart: fresh.data as StoreApiCart,
  };
}

export function persistCartToken(response: NextResponse, cartToken?: string | null): void {
  if (!cartToken) {
    return;
  }

  response.cookies.set({
    name: CART_TOKEN_COOKIE,
    value: cartToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function publicStoreApiError(error: StoreApiError): StoreApiError {
  return {
    code: error.code || 'engineering_demo_store_api_error',
    message: error.message || 'WooCommerce Store API request failed.',
    data: {
      status: error.data?.status,
      cart: error.data?.cart,
    },
  };
}
