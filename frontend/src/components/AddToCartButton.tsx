'use client';

import { useState } from 'react';
import { useCart } from '@/components/CartProvider';

export function AddToCartButton({ productId, disabled = false }: { productId: number; disabled?: boolean }) {
  const { addItem, pending } = useCart();
  const [added, setAdded] = useState(false);

  async function handleClick() {
    const success = await addItem(productId);

    if (success) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1400);
    }
  }

  return (
    <button
      type="button"
      className="button button--primary product-card__button"
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {disabled ? 'Out of stock' : added ? 'Added' : pending ? 'Working…' : 'Add to cart'}
    </button>
  );
}
