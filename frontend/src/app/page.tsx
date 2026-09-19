import { CartPanel } from '@/components/CartPanel';
import { CartProvider } from '@/components/CartProvider';
import { ProductCard } from '@/components/ProductCard';
import { getBackendHealth, getProducts } from '@/lib/wordpress';

const proofPoints = [
  { value: '7', label: 'PHPUnit tests' },
  { value: '19', label: 'Vitest tests' },
  { value: 'E2E', label: 'Playwright + axe' },
  { value: 'CI', label: 'Performance budget' },
];

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
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="Tuluzov Engineering Demo home">
          <span className="brand__mark" aria-hidden="true">T</span>
          <span>
            <strong>Engineering Demo</strong>
            <small>WordPress × Next.js</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Page sections">
          <a href="#architecture">Architecture</a>
          <a href="#commerce">Commerce</a>
          <a href="#runtime">Runtime</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero shell" id="top">
          <div className="hero__copy">
            <p className="eyebrow">Engineering demo · WordPress · WooCommerce · Next.js · Docker</p>
            <h1>A production-shaped headless commerce playground.</h1>
            <p className="hero__lead">
              WordPress and WooCommerce own commerce data. Next.js renders the public
              experience and acts as a BFF for cart and checkout. Docker makes the stack
              reproducible, and GitHub Actions verifies every change.
            </p>

            <div className="hero__actions" aria-label="Demo highlights">
              <a className="button button--primary" href="#commerce">Try the commerce flow</a>
              <a className="button button--ghost" href="#architecture">See the architecture</a>
            </div>

            <dl className="proof-grid" aria-label="Verification summary">
              {proofPoints.map((point) => (
                <div key={point.label}>
                  <dt>{point.value}</dt>
                  <dd>{point.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="runtime-card" id="runtime" aria-label="Backend runtime status">
            <div className="runtime-card__header">
              <span className={backendReady ? 'dot dot--ok' : 'dot'} />
              <div>
                <strong>{backendReady ? 'Backend connected' : 'Backend not ready'}</strong>
                <span>Live runtime metadata</span>
              </div>
            </div>

            <dl>
              <div><dt>WordPress</dt><dd>{health?.wordpress_version ?? '—'}</dd></div>
              <div><dt>WooCommerce</dt><dd>{health?.woocommerce_version ?? '—'}</dd></div>
              <div><dt>PHP</dt><dd>{health?.php_version ?? '—'}</dd></div>
              <div><dt>HPOS</dt><dd>{health?.hpos_enabled === null || health === null ? '—' : health.hpos_enabled ? 'enabled' : 'disabled'}</dd></div>
            </dl>

            <div className="runtime-card__checks" aria-label="Runtime checks">
              <span className={health?.checks?.database ? 'check check--ok' : 'check'}>Database</span>
              <span className={health?.checks?.woocommerce ? 'check check--ok' : 'check'}>WooCommerce</span>
              <span className={health?.checks?.hpos ? 'check check--ok' : 'check'}>HPOS</span>
              <span className={productsResult.status === 'fulfilled' ? 'check check--ok' : 'check'}>Store API</span>
            </div>
          </aside>
        </section>

        <section className="architecture shell" id="architecture" aria-labelledby="architecture-title">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Architecture</p>
              <h2 id="architecture-title">One stack, clear boundaries.</h2>
            </div>
            <p className="section-heading__copy">
              The frontend can shape and protect requests, but WooCommerce stays authoritative
              for prices, stock, checkout validation and order creation.
            </p>
          </div>

          <div className="system-flow" aria-label="Headless commerce request flow">
            <div className="flow-node">
              <span>01</span>
              <strong>Browser</strong>
              <small>same-origin UI</small>
            </div>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <div className="flow-node flow-node--accent">
              <span>02</span>
              <strong>Next.js BFF</strong>
              <small>validation + Cart-Token</small>
            </div>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <div className="flow-node">
              <span>03</span>
              <strong>Store API</strong>
              <small>supported Woo endpoints</small>
            </div>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <div className="flow-node">
              <span>04</span>
              <strong>WooCommerce</strong>
              <small>orders + HPOS</small>
            </div>
          </div>

          <div className="architecture-grid">
            <article>
              <span>01</span>
              <h3>Commerce backend</h3>
              <p>WordPress 7.1 + WooCommerce 11.1 behind supported Store API endpoints and a tiny read-only REST plugin.</p>
            </article>
            <article>
              <span>02</span>
              <h3>BFF boundary</h3>
              <p>Next.js keeps the WooCommerce Cart-Token in an HttpOnly cookie and applies bounded parsing, validation and throttling.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Operational layer</h3>
              <p>Readiness, request IDs and PII-safe JSON logs make the demo observable rather than merely functional.</p>
            </article>
            <article>
              <span>04</span>
              <h3>Quality gate</h3>
              <p>PHPUnit, Vitest, Docker smoke, Playwright, axe and production performance budgets run in GitHub Actions.</p>
            </article>
          </div>
        </section>

        <section className="commerce-wrap" id="commerce">
          <div className="commerce shell">
            <div className="catalog">
              <div className="section-heading section-heading--row">
                <div>
                  <p className="eyebrow">Live Store API</p>
                  <h2 id="catalog-title">WooCommerce products</h2>
                </div>
                <span className="catalog-count">{products.length} loaded</span>
              </div>

              {products.length > 0 ? (
                <div className="product-grid" aria-labelledby="catalog-title">
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
          </div>
        </section>

        <section className="engineering-notes shell" aria-labelledby="engineering-notes-title">
          <div className="section-heading">
            <p className="eyebrow">Engineering details</p>
            <h2 id="engineering-notes-title">What the UI does not hide.</h2>
          </div>
          <div className="notes-grid">
            <article>
              <span className="note-kicker">Security boundary</span>
              <h3>Cart credentials stay server-side.</h3>
              <p>The browser receives an HttpOnly cookie, while the BFF owns the WooCommerce Cart-Token and mutation policy.</p>
            </article>
            <article>
              <span className="note-kicker">Correctness</span>
              <h3>WooCommerce validates twice.</h3>
              <p>Next.js rejects malformed input early, but WooCommerce still performs the authoritative cart and checkout validation.</p>
            </article>
            <article>
              <span className="note-kicker">Delivery</span>
              <h3>Promotion depends on readiness.</h3>
              <p>Prepared production deployment waits for WordPress, WooCommerce, HPOS, Store API and frontend readiness before promotion.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer shell">
        <div>
          <strong>Tuluzov Engineering Demo</strong>
          <span>Headless commerce architecture, tested end to end.</span>
        </div>
        <a href="#top">Back to top ↑</a>
      </footer>
    </CartProvider>
  );
}
