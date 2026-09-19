// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCart } from '@/components/CartProvider';
import { AddToCartButton } from '@/components/AddToCartButton';

vi.mock('@/components/CartProvider', () => ({
  useCart: vi.fn(),
}));

const mockedUseCart = vi.mocked(useCart);

describe('AddToCartButton', () => {
  beforeEach(() => {
    mockedUseCart.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('adds the requested product and confirms success', async () => {
    const addItem = vi.fn().mockResolvedValue(true);

    mockedUseCart.mockReturnValue({
      cart: null,
      loading: false,
      pending: false,
      error: null,
      refreshCart: vi.fn(),
      addItem,
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      checkout: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AddToCartButton productId={42} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    await waitFor(() => {
      expect(addItem).toHaveBeenCalledWith(42);
      expect(screen.getByRole('button', { name: 'Added' })).toBeInTheDocument();
    });
  });

  it('disables the control while a cart mutation is pending', () => {
    mockedUseCart.mockReturnValue({
      cart: null,
      loading: false,
      pending: true,
      error: null,
      refreshCart: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      checkout: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AddToCartButton productId={42} />);

    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  });

  it('exposes an out-of-stock state without allowing a click', () => {
    mockedUseCart.mockReturnValue({
      cart: null,
      loading: false,
      pending: false,
      error: null,
      refreshCart: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      checkout: vi.fn(),
      clearError: vi.fn(),
    });

    render(<AddToCartButton productId={42} disabled />);

    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });
});
