# Validation status

This file deliberately separates static checks from runtime proof. A code path is not reported as runtime-tested until it has actually run against the relevant environment.

## Confirmed by GitHub Actions

### Static, unit and component checks

- PHP syntax for plugin/bootstrap/helper files
- shell syntax for bootstrap/performance/deploy/backup/rollback scripts
- local and production Docker Compose configuration
- Caddy configuration
- frontend dependency installation
- ESLint
- TypeScript type-check
- 19 Vitest tests across six suites
- 7 PHPUnit 11.5 contract tests / 38 assertions for the custom WordPress API plugin
- Next.js production build
- production frontend Docker image build

The PHPUnit suite is deliberately isolated: it stubs only the external WordPress/WooCommerce framework boundary and tests this plugin's own REST registration, HPOS compatibility declaration, liveness/readiness and degraded dependency behaviour. It is not presented as a replacement for the separate live Docker integration test.

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

Axe-core runs automated WCAG 2 A/AA and WCAG 2.1 A/AA checks against the loaded catalogue and the open checkout state. The current CI run reports zero automated axe violations for those two states.

This is automated coverage, not a claim of full manual accessibility certification.

## Production performance budget

Performance is measured against the **production Docker target**, not the development server.

The test starts the same standalone Next.js Docker stage used by production, attaches it to the live WordPress/WooCommerce Docker network and measures it with Chromium.

Versioned budgets:

- TTFB <= 1000 ms
- LCP <= 3000 ms
- CLS <= 0.1
- load event <= 4000 ms
- total encoded transfer <= 1,500,000 bytes
- script encoded transfer <= 800,000 bytes
- DOM nodes <= 700

Measured in the successful GitHub Actions run on 2026-09-19:

- TTFB: ~227.3 ms
- LCP: 352 ms
- CLS: 0
- load event: ~367.4 ms
- total encoded transfer: 149,759 bytes
- script encoded transfer: 134,413 bytes
- DOM nodes: 129

These numbers describe that CI environment/run and are not presented as universal end-user latency. The budget is the durable regression guard; each run uploads `performance-results.json` as an artifact.

## Catalogue caching contract

Only the public product catalogue is cached.

- Next.js fetch revalidation: 60 seconds
- cache tag: `woocommerce-products`
- Store API readiness: `no-store`
- backend health/readiness: `no-store`
- cart/checkout BFF operations: `no-store`

The 60-second catalogue snapshot is presentation data only. WooCommerce remains authoritative during add-to-cart and checkout.

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

- isolated PHPUnit tests are not a full WordPress/WooCommerce integration suite
- application/test code does not query WooCommerce HPOS tables directly; it uses WooCommerce CRUD
- Playwright currently covers Chromium only
- axe is automated accessibility coverage, not manual assistive-technology testing
- one GitHub runner measurement is not a field-performance claim
- production HTTPS, DNS, backup restoration and rollback have not yet been executed on the target VPS

No committed environment secrets are used, and no WordPress or WooCommerce core files are modified.
