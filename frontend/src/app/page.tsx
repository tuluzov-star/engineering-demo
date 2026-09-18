import { CartPanel } from '@/components/CartPanel';
import { CartProvider } from '@/components/CartProvider';
import { ProductCard } from '@/components/ProductCard';
import { getBackendHealth, getProducts } from '@/lib/wordpress';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [productsResult, healthResult] = await Promise.allSettled([
    getProducts(),
    getBackendHealth(),
  ]);

  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
  const health = healthResult.status === 'fulfilled' ? healthResult.value : null;
  const backendReady = productsResult.status === 'fulfilled' && health !== null;

  return (
    <CartProvider>
      <main>
        <section className="hero shell">
          <div>
            <p className="eyebrow">Engineering demo · WordPress · WooCommerce · Next.js · Docker</p>
            <h1>A production-shaped headless commerce playground.</h1>
            <p className="hero__lead">
              WordPress and WooCommerce own commerce data. Next.js renders the public
              experience and acts as a BFF for cart and checkout. Docker makes the stack
              reproducible, and GitHub Actions verifies every change.
            </p>
          </div>

          <aside className="runtime-card">
            <div className="runtime-card__header">
              <span className={backendReady ? 'dot dot--ok' : 'dot'} />
              <strong>{backendReady ? 'Backend connected' : 'Backend not ready'}</strong>
            </div>
            <dl>
              <div><dt>WordPress</dt><dd>{health?.wordpress_version ?? '—'}</dd></div>
              <div><dt>WooCommerce</dt><dd>{health?.woocommerce_version ?? '—'}</dd></div>
              <div><dt>PHP</dt><dd>{health?.php_version ?? '—'}</dd></div>
              <div><dt>HPOS</dt><dd>{health?.hpos_enabled === null || health === null ? '—' : health.hpos_enabled ? 'enabled' : 'disabled'}</dd></div>
            </dl>
          </aside>
        </section>

        <section className="architecture shell" aria-labelledby="architecture-title">
          <div className="section-heading">
            <p className="eyebrow">Architecture</p>
            <h2 id="architecture-title">One stack, clear boundaries.</h2>
          </div>
          <div className="architecture-grid">
            <article><span>01</span><h3>Commerce backend</h3><p>WordPress 7.1 + WooCommerce 11.1, isolated behind supported Store API endpoints and a tiny custom REST plugin.</p></article>
            <article><span>02</span><h3>BFF frontend</h3><p>Next.js 16 App Router renders products and proxies cart/checkout while keeping the WooCommerce Cart-Token in an HttpOnly cookie.</p></article>
            <article><span>03</span><h3>Infrastructure</h3><p>Docker Compose coordinates MariaDB, WordPress, WP-CLI and the frontend with persistent volumes.</p></article>
            <article><span>04</span><h3>Quality gate</h3><p>GitHub Actions runs PHP syntax checks, TypeScript, ESLint, Next.js build and Compose validation.</p></article>
          </div>
        </section>

        <section className="commerce shell" aria-labelledby="catalog-title">
          <div className="catalog">
            <div className="section-heading section-heading--row">
              <div>
                <p className="eyebrow">Live Store API</p>
                <h2 id="catalog-title">WooCommerce products</h2>
              </div>
              <span>{products.length} loaded</span>
            </div>

            {products.length > 0 ? (
              <div className="product-grid">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="empty-state">
                <h3>The frontend is running.</h3>
                <p>
                  Initialise WordPress with <code>./scripts/init.sh</code> or
                  <code> .\scripts\init.ps1</code>. The seeded WooCommerce catalogue will then
                  appear here automatically.
                </p>
              </div>
            )}
          </div>

          <CartPanel />
        </section>
      </main>
    </CartProvider>
  );
}
