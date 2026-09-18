// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCart } from '@/components/CartProvider';
import { CartPanel } from '@/components/CartPanel';
import type { StoreApiCart } from '@/lib/store-api';

vi.mock('@/components/CartProvider', () => ({
  useCart: vi.fn(),
}));

const mockedUseCart = vi.mocked(useCart);

const cart: StoreApiCart = {
  items: [
    {
      key: 'item-key',
      id: 13,
      quantity: 1,
      name: 'Alpine Headless Tent',
      sku: 'DEMO-TENT-001',
      images: [],
      prices: {
        price: '24900',
        regular_price: '24900',
        sale_price: '',
        currency_code: 'USD',
        currency_symbol: '$',
        currency_minor_unit: 2,
      },
      totals: {
        line_subtotal: '24900',
        line_subtotal_tax: '0',
        line_total: '24900',
        line_total_tax: '0',
        currency_code: 'USD',
        currency_symbol: '$',
        currency_minor_unit: 2,
      },
    },
  ],
  items_count: 1,
  items_weight: 0,
  needs_payment: true,
  needs_shipping: false,
  has_calculated_shipping: true,
  totals: {
    total_items: '24900',
    total_items_tax: '0',
    total_fees: '0',
    total_fees_tax: '0',
    total_discount: '0',
    total_discount_tax: '0',
    total_shipping: '0',
    total_shipping_tax: '0',
    total_price: '24900',
    total_tax: '0',
    currency_code: 'USD',
    currency_symbol: '$',
    currency_minor_unit: 2,
  },
};

describe('CartPanel', () => {
  const updateItem = vi.fn().mockResolvedValue(true);
  const removeItem = vi.fn().mockResolvedValue(true);
  const checkout = vi.fn().mockResolvedValue({
    order_id: 321,
    status: 'on-hold',
    order_key: 'wc_order_demo',
    customer_note: '',
  });
  const clearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseCart.mockReturnValue({
      cart,
      loading: false,
      pending: false,
      error: null,
      refreshCart: vi.fn(),
      addItem: vi.fn(),
      updateItem,
      removeItem,
      checkout,
      clearError,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders cart controls and forwards quantity/remove actions', () => {
    render(<CartPanel />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Increase Alpine Headless Tent quantity',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(updateItem).toHaveBeenCalledWith('item-key', 2);
    expect(removeItem).toHaveBeenCalledWith('item-key');
  });

  it('opens checkout with accessible fields and creates an order', async () => {
    render(<CartPanel />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to demo checkout' }),
    );

    expect(screen.getByLabelText('First name')).toHaveValue('Demo');
    expect(screen.getByLabelText('Last name')).toHaveValue('Customer');
    expect(screen.getByLabelText('Email')).toHaveValue('customer@example.com');
    expect(screen.getByLabelText('Order note')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Create WooCommerce order' }),
    );

    await waitFor(() => {
      expect(checkout).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText('Order #321 created'),
      ).toBeInTheDocument();
      expect(screen.getByText('Status: on-hold')).toBeInTheDocument();
    });

    const payload = checkout.mock.calls[0][0];
    expect(payload.email).toBe('customer@example.com');
    expect(payload.country).toBe('US');
  });
});
