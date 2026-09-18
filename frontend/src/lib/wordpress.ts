export type StoreApiImage = {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  name: string;
  alt: string;
};

export type StoreApiProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  summary: string;
  short_description: string;
  sku: string;
  average_rating: string;
  review_count: number;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
  };
  images: StoreApiImage[];
  is_in_stock: boolean;
};

export type BackendHealth = {
  project: string;
  status: string;
  wordpress_version: string;
  woocommerce_version: string | null;
  php_version: string;
  environment: string;
  hpos_enabled: boolean | null;
  timestamp_utc: string;
};

const internalWordPressUrl =
  process.env.WORDPRESS_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_WORDPRESS_URL ??
  'http://localhost:8080';

export async function getProducts(): Promise<StoreApiProduct[]> {
  const response = await fetch(
    `${internalWordPressUrl}/wp-json/wc/store/v1/products?per_page=8&orderby=date&order=desc`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(`WooCommerce Store API returned ${response.status}.`);
  }

  return (await response.json()) as StoreApiProduct[];
}

export async function getBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(
    `${internalWordPressUrl}/wp-json/engineering-demo/v1/health`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(`Backend health endpoint returned ${response.status}.`);
  }

  return (await response.json()) as BackendHealth;
}

export function formatProductPrice(product: StoreApiProduct): string {
  const divisor = 10 ** product.prices.currency_minor_unit;
  const amount = Number(product.prices.price) / divisor;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.prices.currency_code,
  }).format(amount);
}

export function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
