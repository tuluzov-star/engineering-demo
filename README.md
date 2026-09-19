# Tuluzov Engineering Demo

A portfolio-grade headless commerce playground that connects a **WordPress + WooCommerce backend** to a **Next.js frontend/BFF**, runs locally with **Docker Compose**, and is verified by **GitHub Actions CI**.

The project is intentionally close to real production work: WooCommerce remains the commerce source of truth, WordPress is extended through a small public REST plugin rather than core modifications, and the frontend consumes supported APIs.

## What it demonstrates

- headless WooCommerce product catalogue
- Store API cart with add/update/remove operations
- server-side WooCommerce `Cart-Token` handling via an HttpOnly cookie
- Next.js Route Handlers used as a Backend-for-Frontend boundary
- checkout and WooCommerce order creation without a real payment transaction
- HPOS-aware WordPress/WooCommerce code and bootstrap
- bounded/validated mutation request bodies
- rate limiting for public cart and checkout mutations
- separate liveness/readiness probes for WordPress and Next.js
- structured JSON BFF request logs with request IDs and no checkout PII
- 19 Vitest unit/component tests across validation, cache policy and commerce UI behaviour
- 7 PHPUnit contract tests / 38 assertions for the custom WordPress API plugin
- axe-core WCAG A/AA checks for catalogue and checkout states
- 60-second Next.js revalidation for the public product catalogue only
- Playwright Chromium coverage for the real cart/checkout UI flow
- reproducible local Docker infrastructure
- automated Docker integration smoke testing
- production Docker topology with Caddy HTTPS
- production performance budgets measured against the standalone Docker target
- release-based GitHub Actions deployment, backup and rollback workflows

## Stack

- WordPress 7.1.x
- WooCommerce 11.1.0
- PHP 8.3
- MariaDB 11.4
- Next.js 16.3.3 / React 19
- Node.js 24
- Vitest 5
- Playwright 1.63
- Docker Compose
- Caddy 2.11
- GitHub Actions

## Local start

### Windows / PowerShell

```powershell
Copy-Item .env.example .env
.\scripts\init.ps1
```

### macOS / Linux

```bash
cp .env.example .env
./scripts/init.sh
```

The init script builds and starts the services, installs WordPress, installs and activates WooCommerce, enables HPOS when required, configures the offline demo payment method, activates the custom demo API plugin, and seeds four virtual sample products.

Open:

- Next.js frontend: `http://localhost:3000`
- WordPress backend: `http://localhost:8080`
- backend liveness: `http://localhost:8080/wp-json/engineering-demo/v1/live`
- backend readiness: `http://localhost:8080/wp-json/engineering-demo/v1/ready`
- frontend liveness: `http://localhost:3000/api/live`
- frontend readiness: `http://localhost:3000/api/ready`
- backward-compatible backend health: `http://localhost:8080/wp-json/engineering-demo/v1/health`
- WooCommerce Store API: `http://localhost:8080/wp-json/wc/store/v1/products`

Before exposing the environment publicly, replace the demo credentials in `.env`.

## Cart and checkout architecture

The browser never receives the WooCommerce `Cart-Token` directly. It calls same-origin Next.js routes; the BFF talks to WooCommerce and stores the token in an `HttpOnly`, `SameSite=Lax` cookie.

```text
Browser -> Next.js BFF -> WooCommerce Store API -> WooCommerce order / HPOS
             |
             +-> HttpOnly cart-token cookie
```

Checkout uses WooCommerce's built-in offline `cheque` gateway with demo-only wording. **No real payment is collected.**

The mutation boundary also rejects malformed or oversized JSON before it reaches WooCommerce. Cart mutations and checkout attempts use separate per-client rate-limit windows. The current limiter is deliberately process-local because the production design is a single Next.js instance; a horizontally scaled deployment would move this state to Redis or another shared store.

## Tests

```bash
cd frontend
npm test
npm run e2e
```

Vitest covers checkout validation/sanitization, bounded JSON parsing, rate limiting, catalogue cache policy, AddToCartButton and CartPanel behaviour.

The Playwright suite exercises the actual browser UI against the running Docker stack:

- load the live WooCommerce catalogue
- add a product to the cart
- change quantity
- remove a product
- open checkout
- submit the demo checkout form
- verify that a WooCommerce order is created
- run axe-core WCAG A/AA checks on the catalogue and open checkout state

CI keeps Playwright traces/screenshots/videos only when a browser test fails. It also uploads a JSON performance result for the production Docker target.

## Performance budget

The budget is measured against the production standalone Next.js Docker target connected to the live Docker WordPress/WooCommerce backend.

Current limits:

- TTFB <= 1000 ms
- LCP <= 3000 ms
- CLS <= 0.1
- load event <= 4000 ms
- total encoded transfer <= 1.5 MB
- script encoded transfer <= 800 KB
- DOM nodes <= 700

A successful GitHub Actions run on 2026-09-19 measured approximately **227 ms TTFB, 352 ms LCP, 0 CLS, 367 ms load, 150 KB total transfer, 134 KB JavaScript and 129 DOM nodes**.

Those values are a CI measurement, not a field-performance guarantee. The committed budget is the regression guard.

## Production target

The production topology is prepared for a small Linux VPS:

```text
Internet
   |
   v
Caddy :80/:443
   |----------------------|
   v                      v
lab.tuluzov.com           cms.lab.tuluzov.com
Next.js :3000             WordPress :80
   |                      |
   +------ backend -------+
              |
              v
          MariaDB
```

The existing `demo.tuluzov.com` remains the independent WordPress/WooCommerce plugin-demo site.

The current REG.RU shared-hosting account was inspected and deliberately rejected as the Next.js production target: it has no usable Docker daemon for the hosting user, and its Passenger configuration is restricted to the hosting-provided Python application type. The project does not use a Python-to-Node proxy or unmanaged background daemon as a workaround.

See `docs/DEPLOYMENT.md` for the VPS, DNS, GitHub environment, backup and rollback procedure.

## Useful commands

### Local

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f wordpress
docker compose run --rm wp-cli /scripts/bootstrap-wp.sh
docker compose run --rm wp-cli -c 'wp wc hpos status --allow-root'
sh scripts/smoke-test.sh
docker compose down
```

`docker compose down` stops the local environment but keeps data volumes. `docker compose down -v` also deletes the database and WordPress data and should only be used when a full reset is intended.

### Production

```bash
sh scripts/backup-production.sh /opt/engineering-demo
sh scripts/deploy-production.sh /opt/engineering-demo <git-sha>
sh scripts/rollback-production.sh /opt/engineering-demo
```

Production deployment is disabled until the VPS and GitHub production secrets/variables are configured.

## Repository structure

```text
.
├── backend/
│   └── wp-content/plugins/engineering-demo-api/
├── deploy/
│   └── Caddyfile
├── frontend/
│   ├── e2e/
│   ├── src/app/api/cart/
│   ├── src/app/api/checkout/
│   ├── src/components/
│   └── src/lib/
├── scripts/
├── docs/
├── .github/workflows/
├── docker-compose.yml
└── docker-compose.production.yml
```

See:

- `docs/ARCHITECTURE.md` — design decisions
- `docs/DEPLOYMENT.md` — production deployment and rollback
- `docs/ROADMAP.md` — implementation stages
- `docs/VALIDATION.md` — exact verification status

## CI

GitHub Actions checks:

- ESLint
- TypeScript
- 19 Vitest unit/component tests
- Next.js production build
- PHP syntax
- PHPUnit 11.5 plugin contract tests
- shell script syntax
- local and production Docker Compose configuration
- Caddy configuration
- production frontend container build
- full Docker runtime bootstrap
- live WooCommerce Store API catalogue
- API-level BFF cart/checkout + HPOS flow
- Playwright Chromium cart/checkout UI flow
- order retrieval through WooCommerce CRUD with HPOS enabled
- WordPress/Next.js liveness and dependency-aware readiness
- X-Request-ID propagation and structured commerce log records without checkout email PII
- production performance budget (TTFB, LCP, CLS, load, transfer size and DOM size)

The CD workflow is guarded by the repository variable `DEPLOY_ENABLED`, so production cannot be deployed accidentally before the target VPS is provisioned.
