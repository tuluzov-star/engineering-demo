'use client';

import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useCart } from '@/components/CartProvider';
import { formatStoreMoney } from '@/lib/store-api';

const INITIAL_FORM = {
  first_name: 'Demo',
  last_name: 'Customer',
  email: 'customer@example.com',
  phone: '',
  address_1: '550 Central Park West',
  address_2: '',
  city: 'New York',
  state: 'NY',
  postcode: '10023',
  country: 'US',
  customer_note: 'Engineering demo order created through WooCommerce Store API.',
};

export function CartPanel() {
  const { cart, loading, pending, error, updateItem, removeItem, checkout, clearError } = useCart();
  const [form, setForm] = useState(INITIAL_FORM);
  const [orderResult, setOrderResult] = useState<{ id: number; status: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const itemCount = cart?.items_count ?? 0;

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    const result = await checkout(form);

    if (result) {
      setOrderResult({ id: result.order_id, status: result.status });
      setCheckoutOpen(false);
    }
  }

  return (
    <aside className="cart-panel" aria-labelledby="cart-title">
      <div className="cart-panel__header">
        <div>
          <p className="eyebrow">Headless cart</p>
          <h2 id="cart-title">Cart</h2>
        </div>
        <span className="cart-count">{itemCount}</span>
      </div>

      <p className="cart-panel__security">
        WooCommerce <code>Cart-Token</code> stays server-side in an HttpOnly cookie. Browser code talks only to the Next.js BFF routes.
      </p>

      {orderResult ? (
        <div className="checkout-success" role="status">
          <strong>Order #{orderResult.id} created</strong>
          <span>Status: {orderResult.status}</span>
          <button type="button" className="text-button" onClick={() => setOrderResult(null)}>
            Start another cart
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="commerce-error" role="alert">
          <span>{error}</span>
          <button type="button" className="text-button" onClick={clearError}>Dismiss</button>
        </div>
      ) : null}

      {loading ? <p className="cart-empty">Loading cart…</p> : null}

      {!loading && itemCount === 0 && !orderResult ? (
        <p className="cart-empty">Add a seeded product to exercise the WooCommerce Store API session.</p>
      ) : null}

      {cart?.items.map((item) => (
        <article className="cart-item" key={item.key}>
          <div className="cart-item__main">
            <strong>{item.name}</strong>
            <span>{formatStoreMoney(item.totals.line_total, item.totals)}</span>
          </div>
          <div className="cart-item__controls">
            <button
              type="button"
              aria-label={`Decrease ${item.name} quantity`}
              disabled={pending || item.quantity <= 1}
              onClick={() => void updateItem(item.key, item.quantity - 1)}
            >
              −
            </button>
            <span>{item.quantity}</span>
            <button
              type="button"
              aria-label={`Increase ${item.name} quantity`}
              disabled={pending || item.quantity >= 99}
              onClick={() => void updateItem(item.key, item.quantity + 1)}
            >
              +
            </button>
            <button
              type="button"
              className="text-button cart-item__remove"
              disabled={pending}
              onClick={() => void removeItem(item.key)}
            >
              Remove
            </button>
          </div>
        </article>
      ))}

      {cart && itemCount > 0 ? (
        <>
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatStoreMoney(cart.totals.total_price, cart.totals)}</strong>
          </div>

          <button
            type="button"
            className="button button--primary button--full"
            disabled={pending}
            onClick={() => setCheckoutOpen((value) => !value)}
          >
            {checkoutOpen ? 'Hide checkout' : 'Continue to demo checkout'}
          </button>
        </>
      ) : null}

      {checkoutOpen && cart && itemCount > 0 ? (
        <form className="checkout-form" onSubmit={handleCheckout}>
          <div className="checkout-form__intro">
            <strong>Store API checkout</strong>
            <span>Offline “cheque” gateway — no real payment is collected.</span>
          </div>

          <div className="checkout-form__grid">
            <Field label="First name" name="first_name" value={form.first_name} onChange={setForm} required />
            <Field label="Last name" name="last_name" value={form.last_name} onChange={setForm} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={setForm} required wide />
            <Field label="Phone" name="phone" value={form.phone} onChange={setForm} wide />
            <Field label="Address" name="address_1" value={form.address_1} onChange={setForm} required wide />
            <Field label="Apartment / suite" name="address_2" value={form.address_2} onChange={setForm} wide />
            <Field label="City" name="city" value={form.city} onChange={setForm} required />
            <Field label="State" name="state" value={form.state} onChange={setForm} />
            <Field label="Postcode" name="postcode" value={form.postcode} onChange={setForm} required />
            <Field label="Country" name="country" value={form.country} onChange={setForm} required maxLength={2} />
          </div>

          <label className="checkout-field checkout-field--wide">
            <span>Order note</span>
            <textarea
              value={form.customer_note}
              maxLength={500}
              onChange={(event) => setForm((current) => ({ ...current, customer_note: event.target.value }))}
            />
          </label>

          <button type="submit" className="button button--primary button--full" disabled={pending}>
            {pending ? 'Creating order…' : 'Create WooCommerce order'}
          </button>
        </form>
      ) : null}
    </aside>
  );
}

type CheckoutForm = typeof INITIAL_FORM;
type CheckoutFieldName = Exclude<keyof CheckoutForm, 'customer_note'>;

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  wide = false,
  maxLength = 160,
}: {
  label: string;
  name: CheckoutFieldName;
  value: string;
  onChange: Dispatch<SetStateAction<CheckoutForm>>;
  type?: string;
  required?: boolean;
  wide?: boolean;
  maxLength?: number;
}) {
  return (
    <label className={`checkout-field${wide ? ' checkout-field--wide' : ''}`}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(event) => onChange((current) => ({ ...current, [name]: event.target.value }))}
      />
    </label>
  );
}
