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
- 12 Vitest unit tests across:
  - checkout normalization/validation
  - bounded JSON request parsing
  - rate-limit window/key/header behaviour
- Next.js production build
- production frontend Docker image build

### Docker/API runtime proof

The automated integration job successfully performs the following on a clean GitHub-hosted runner:

- pulls and starts MariaDB, WordPress and Next.js containers
- installs WordPress against MariaDB
- installs and activates WooCommerce 11.1.0
- activates the custom Engineering Demo API plugin
- enables HPOS
- configures the offline demo `cheque` payment gateway
- seeds four virtual WooCommerce products
- confirms the WordPress/WooCommerce health endpoint reports HPOS enabled
- loads the live WooCommerce Store API catalogue
- loads the Next.js frontend
- creates a cart session through the Next.js BFF
- adds a product with quantity 2
- submits checkout through the Next.js BFF and WooCommerce Store API
- receives a numeric WooCommerce order ID
- retrieves the resulting order through WooCommerce CRUD while HPOS is enabled

### Browser runtime proof

Playwright 1.63 runs Chromium against the same live Docker stack.

Confirmed browser flows:

- the public page hydrates successfully
- backend runtime status is visible
- a seeded product can be added to the cart
- cart quantity can be increased
- a cart item can be removed
- the checkout form opens with the demo customer data
- checkout completes through the Next.js BFF
- the UI shows the resulting WooCommerce order ID/status

Failure-only Playwright traces, screenshots and video are uploaded as GitHub Actions artifacts.

## API hardening confirmed by tests/build/runtime

- cart mutation JSON bodies are bounded to 2 KiB
- checkout JSON bodies are bounded to 12 KiB
- malformed JSON returns an explicit 400 response
- oversized JSON returns an explicit 413 response
- cart mutations are limited to 40 requests/minute per derived client address
- checkout is limited to 8 attempts/10 minutes per derived client address
- rate-limit metadata is returned in response headers
- checkout inputs are normalized and validated before forwarding to WooCommerce

The limiter is intentionally process-local for the current single-instance demo architecture. It is not claimed as a distributed rate limiter; horizontal scaling would require shared state such as Redis/KV.

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
- `demo.tuluzov.com` is an existing WordPress/WooCommerce plugin-demo site and was not repurposed
- `lab.tuluzov.com` was returned to its original HTTP 200 placeholder after temporary tests

Temporary Node/Passenger probe files were removed after testing.

## Production delivery code prepared but not yet live-proven

The repository includes:

- `docker-compose.production.yml`
- Caddy automatic HTTPS configuration
- production standalone Next.js image build
- release-based deployment script
- database/uploads backup script
- automatic failed-deploy code rollback
- manual rollback script/workflow
- guarded GitHub Actions CD workflow

These files pass CI, but they are not reported as live production-verified until a VPS is provisioned and the first deployment completes successfully.

## Deliberately not claimed

- The smoke test does not query WooCommerce HPOS tables directly. Application and test code use WooCommerce CRUD APIs rather than depending on internal database storage.
- Playwright currently covers Chromium only; Firefox/WebKit coverage has not been claimed.
- Dedicated accessibility and performance measurements have not yet been run.
- Production HTTPS, DNS, backup restoration and rollback have not yet been executed on the target VPS.

No committed environment secrets are used, and no WordPress or WooCommerce core files are modified.
