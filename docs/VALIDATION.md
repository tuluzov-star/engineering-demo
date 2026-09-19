# Validation status

This file deliberately separates static checks from runtime proof. A code path is not reported as runtime-tested until it has actually run against the relevant environment.

## Confirmed by GitHub Actions

### Static, unit and component checks

- PHP syntax for plugin/bootstrap helper files
- shell syntax for bootstrap/deploy/backup/rollback scripts
- local and production Docker Compose configuration
- Caddy configuration
- frontend dependency installation
- ESLint
- TypeScript type-check
- 19 Vitest tests across six suites:
  - checkout normalization/validation
  - bounded JSON request parsing
  - rate limiting
  - catalogue cache/readiness fetch policy
  - AddToCartButton component behaviour
  - CartPanel controls and checkout success
- Next.js production build
- production frontend Docker image build

### Docker/API runtime proof

The automated integration job successfully:

- installs and boots MariaDB, WordPress, WooCommerce and Next.js
- enables HPOS and seeds four virtual WooCommerce products
- verifies WordPress and Next.js liveness/readiness
- verifies backward-compatible health endpoints
- loads the live Store API catalogue and frontend
- creates a cart, adds quantity 2 and completes Store API checkout
- retrieves the order through WooCommerce CRUD with HPOS enabled
- verifies X-Request-ID propagation and structured BFF logs
- verifies the checkout test email does not appear in frontend logs

### Browser and accessibility proof

Playwright 1.63 runs Chromium against the same live Docker stack.

Confirmed browser flows:

- public page hydration and backend status
- add-to-cart
- quantity increase
- item removal
- checkout opening/submission
- WooCommerce order ID/status shown in the UI

Axe-core runs automated WCAG 2 A/AA and WCAG 2.1 A/AA checks against:

- the loaded catalogue page
- the page with checkout form open

The current CI run reports zero automated axe violations for those two states.

This is automated coverage, not a claim of full manual accessibility certification.

## Catalogue caching contract

Only the public product catalogue is cached.

- Next.js fetch revalidation: 60 seconds
- cache tag: `woocommerce-products`
- Store API readiness: `no-store`
- backend health/readiness: `no-store`
- cart/checkout BFF operations: `no-store`

The 60-second catalogue snapshot is presentation data only. WooCommerce remains authoritative during add-to-cart and checkout, so stale catalogue data cannot itself create an invalid order.

The cache tag is reserved for future explicit invalidation (for example, a signed webhook) without requiring that complexity for the current demo.

## Observability contract

BFF commerce records are emitted as single-line JSON to stdout with technical metadata only: timestamp, level, service, event, request ID, static route, status, outcome, duration, upstream status and technical error code.

Checkout values, email, address, IP address and Cart-Token are not passed to the structured logger.

## API hardening

- cart mutation JSON bodies are bounded to 2 KiB
- checkout JSON bodies are bounded to 12 KiB
- malformed JSON returns 400
- oversized JSON returns 413
- cart mutations are limited to 40 requests/minute per derived client address
- checkout is limited to 8 attempts/10 minutes per derived client address
- checkout is normalized and validated before forwarding to WooCommerce

The limiter is intentionally process-local for the current single-instance demo. Horizontal scaling would require shared state such as Redis/KV.

## Confirmed against the existing hosting account

The current REG.RU shared-hosting account was inspected and restored after temporary diagnostics. It is not used as the production Next.js target, and `demo.tuluzov.com` was not repurposed.

## Production delivery code prepared but not yet live-proven

Production Compose and deployment promotion use dependency-aware readiness. Production HTTPS, DNS, backup restoration and rollback are not claimed as live-verified until a VPS is provisioned.

## Deliberately not claimed

- application/test code does not query WooCommerce HPOS tables directly; it uses WooCommerce CRUD
- Playwright currently covers Chromium only
- axe is automated accessibility coverage, not manual assistive-technology testing
- production HTTPS, DNS, backup restoration and rollback have not yet been executed on the target VPS

No committed environment secrets are used, and no WordPress or WooCommerce core files are modified.
