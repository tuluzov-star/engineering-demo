'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CheckoutAddress,
  StoreApiCart,
  StoreApiCheckoutResponse,
  StoreApiError,
} from '@/lib/store-api';

type CheckoutInput = CheckoutAddress & {
  customer_note?: string;
};

type CartContextValue = {
  cart: StoreApiCart | null;
  loading: boolean;
  pending: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<boolean>;
  updateItem: (key: string, quantity: number) => Promise<boolean>;
  removeItem: (key: string) => Promise<boolean>;
  checkout: (input: CheckoutInput) => Promise<StoreApiCheckoutResponse | null>;
  clearError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoreApiCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCart = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      cache: 'no-store',
    });

    const payload = (await response.json()) as StoreApiCart | StoreApiError;

    if (!response.ok) {
      const storeError = payload as StoreApiError;
      throw new Error(storeError.message || 'WooCommerce cart request failed.');
    }

    return payload as StoreApiCart;
  }, []);

  const refreshCart = useCallback(async () => {
    setLoading(true);

    try {
      setCart(await requestCart('/api/cart'));
      setError(null);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [requestCart]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const mutate = useCallback(
    async (url: string, init: RequestInit): Promise<boolean> => {
      setPending(true);

      try {
        setCart(await requestCart(url, init));
        setError(null);
        return true;
      } catch (requestError) {
        setError(toMessage(requestError));
        return false;
      } finally {
        setPending(false);
      }
    },
    [requestCart],
  );

  const addItem = useCallback(
    (productId: number, quantity = 1) =>
      mutate('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ id: productId, quantity }),
      }),
    [mutate],
  );

  const updateItem = useCallback(
    (key: string, quantity: number) =>
      mutate(`/api/cart/items/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    [mutate],
  );

  const removeItem = useCallback(
    (key: string) =>
      mutate(`/api/cart/items/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      }),
    [mutate],
  );

  const checkout = useCallback(async (input: CheckoutInput) => {
    setPending(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as StoreApiCheckoutResponse | StoreApiError;

      if (!response.ok) {
        const storeError = payload as StoreApiError;
        if (storeError.data?.cart) {
          setCart(storeError.data.cart);
        }
        throw new Error(storeError.message || 'Checkout failed.');
      }

      setCart(null);
      setError(null);
      return payload as StoreApiCheckoutResponse;
    } catch (requestError) {
      setError(toMessage(requestError));
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      pending,
      error,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      checkout,
      clearError: () => setError(null),
    }),
    [cart, loading, pending, error, refreshCart, addItem, updateItem, removeItem, checkout],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }

  return context;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected commerce error.';
}
