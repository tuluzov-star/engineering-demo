# Validation status

This file deliberately separates static checks from runtime proof. A code path is not reported as runtime-tested until it has actually run against the relevant environment.

## Confirmed by GitHub Actions

### Static, unit and build checks

- PHP syntax: `engineering-demo-api.php`
- PHP syntax: `seed-products.php`
- PHP syntax: `configure-store.php`
- PHP syntax: `verify-order.php`
- shell syntax for bootstrap/deploy/backup/rollback scripts
- local and production Docker Compose configuration
- Caddy configuration
- frontend dependency installation
- ESLint
- TypeScript type-check
- 12 Vitest unit tests across checkout validation, bounded JSON parsing and rate limiting
- Next.js production build
- production frontend Docker image build

### Docker/API runtime proof

The automated integration job successfully performs the following on a clean GitHub-hosted runner:

- installs and boots MariaDB, WordPress, WooCommerce and Next.js
- enables HPOS and seeds four virtual WooCommerce products
- verifies WordPress `/live` returns process liveness
- verifies WordPress `/ready` confirms database, WooCommerce and HPOS readiness
- verifies Next.js `/api/live` returns frontend liveness
- verifies Next.js `/api/ready` confirms backend and Store API readiness
- verifies the backward-compatible `/health` endpoints remain healthy
- loads the live Store API catalogue and Next.js frontend
- creates a cart session, adds quantity 2 and completes Store API checkout
- retrieves the created order through WooCommerce CRUD with HPOS enabled
- verifies caller-supplied `X-Request-ID` is returned by BFF mutation responses
- verifies structured `http_request` JSON records for cart and checkout appear in frontend logs
- verifies the checkout test email does not appear in frontend logs

### Browser runtime proof

Playwright 1.63 runs Chromium against the same live Docker stack.

Confirmed browser flows:

- public page hydration
- backend status visibility
- add-to-cart
- quantity increase
- item removal
- checkout form opening
- checkout submission through the BFF
- WooCommerce order ID/status shown in the UI

Failure-only Playwright traces, screenshots and video are uploaded as GitHub Actions artifacts.

## Observability contract

BFF commerce records are emitted as single-line JSON to stdout.

The structured record is intentionally limited to technical metadata such as:

- timestamp / level / service / event
- request ID
- static route name
- HTTP status
- outcome
- duration
- upstream status
- technical error code

Checkout form values, email, address, IP address and WooCommerce Cart-Token are not passed to the structured logger.

## API hardening confirmed by tests/build/runtime

- cart mutation JSON bodies are bounded to 2 KiB
- checkout JSON bodies are bounded to 12 KiB
- malformed JSON returns 400
- oversized JSON returns 413
- cart mutations are limited to 40 requests/minute per derived client address
- checkout is limited to 8 attempts/10 minutes per derived client address
- rate-limit metadata is returned in response headers
- checkout inputs are normalized and validated before forwarding to WooCommerce

The limiter is intentionally process-local for the current single-instance demo architecture. Horizontal scaling would require shared state such as Redis/KV.

## Confirmed against the existing hosting account

Read-only and temporary deployment diagnostics were run against the current REG.RU shared-hosting account.

Confirmed:

- AlmaLinux 8.10
- PHP 8.2-8.5 and WP-CLI available
- no Docker daemon available to the hosting user
- system Node.js 10.24.0
- verified user-space Node.js 24.21.0 binary can execute
- Phusion Passenger 6.2.0 is loaded by Apache
- hosting-generated Passenger configuration is Python-oriented
- Apache rejects `PassengerAppType node` in `.htaccess` as `not allowed here`
- `demo.tuluzov.com` was not repurposed
- `lab.tuluzov.com` was returned to its original HTTP 200 placeholder after temporary tests

## Production delivery code prepared but not yet live-proven

Production Compose now uses frontend readiness rather than simple process liveness. The deployment script waits for both internal frontend readiness and public HTTPS readiness before advancing a release.

Production HTTPS, DNS, backup restoration and rollback are still not claimed as live-verified until the VPS is provisioned.

## Deliberately not claimed

- application/test code does not query WooCommerce HPOS tables directly; it uses WooCommerce CRUD
- Playwright currently covers Chromium only
- dedicated accessibility and performance measurements have not yet been run
- production HTTPS, DNS, backup restoration and rollback have not yet been executed on the target VPS

No committed environment secrets are used, and no WordPress or WooCommerce core files are modified.
