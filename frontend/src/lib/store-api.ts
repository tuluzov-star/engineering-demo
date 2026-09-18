import type { StoreApiImage } from '@/lib/wordpress';

export type StoreApiMoney = {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
};

export type StoreApiCartItem = {
  key: string;
  id: number;
  quantity: number;
  name: string;
  sku: string;
  images: StoreApiImage[];
  prices: StoreApiMoney & {
    price: string;
    regular_price: string;
    sale_price: string;
  };
  totals: StoreApiMoney & {
    line_subtotal: string;
    line_subtotal_tax: string;
    line_total: string;
    line_total_tax: string;
  };
};

export type StoreApiCart = {
  items: StoreApiCartItem[];
  items_count: number;
  items_weight: number;
  needs_payment: boolean;
  needs_shipping: boolean;
  has_calculated_shipping: boolean;
  totals: StoreApiMoney & {
    total_items: string;
    total_items_tax: string;
    total_fees: string;
    total_fees_tax: string;
    total_discount: string;
    total_discount_tax: string;
    total_shipping: string;
    total_shipping_tax: string;
    total_price: string;
    total_tax: string;
  };
};

export type StoreApiError = {
  code: string;
  message: string;
  data?: {
    status?: number;
    cart?: StoreApiCart;
  };
};

export type CheckoutAddress = {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
};

export type CheckoutPayload = {
  billing_address: CheckoutAddress;
  shipping_address: Omit<CheckoutAddress, 'email' | 'phone'>;
  payment_method: string;
  payment_data?: Array<{ key: string; value: string }>;
  customer_note?: string;
  expected_total?: string;
};

export type StoreApiCheckoutResponse = {
  order_id: number;
  status: string;
  order_key: string;
  customer_note: string;
  payment_result?: {
    payment_status: string;
    payment_details: Array<{ key: string; value: string }>;
    redirect_url: string;
  };
};

export function formatStoreMoney(value: string, money: StoreApiMoney): string {
  const divisor = 10 ** money.currency_minor_unit;
  const amount = Number(value) / divisor;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency_code,
  }).format(amount);
}
