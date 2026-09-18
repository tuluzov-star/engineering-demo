import Image from 'next/image';
import {
  formatProductPrice,
  plainText,
  type StoreApiProduct,
} from '@/lib/wordpress';

type ProductCardProps = {
  product: StoreApiProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images[0];
  const description = plainText(product.summary || product.short_description);

  return (
    <article className="product-card">
      <div className="product-card__media">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt || product.name}
            fill
            sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 25vw"
          />
        ) : (
          <div className="product-card__placeholder" aria-hidden="true">
            WC
          </div>
        )}
      </div>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.sku || `#${product.id}`}</span>
          <span className={product.is_in_stock ? 'status status--ok' : 'status'}>
            {product.is_in_stock ? 'In stock' : 'Out of stock'}
          </span>
        </div>
        <h2>{product.name}</h2>
        <p>{description || 'WooCommerce product delivered through the Store API.'}</p>
        <strong>{formatProductPrice(product)}</strong>
      </div>
    </article>
  );
}
