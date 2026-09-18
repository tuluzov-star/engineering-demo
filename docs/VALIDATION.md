# Validation status

This file deliberately separates static checks from runtime proof. A code path is not reported as runtime-tested until it has actually run against the relevant environment.

## Confirmed by GitHub Actions

### Static and build checks

- PHP syntax: `engineering-demo-api.php`
- PHP syntax: `seed-products.php`
- PHP syntax: `configure-store.php`
- PHP syntax: `verify-order.php`
- shell syntax: `bootstrap-wp.sh`
- shell syntax: `init.sh`
- shell syntax: `smoke-test.sh`
- Docker Compose configuration
- frontend dependency installation
- ESLint
- TypeScript type-check
- Next.js production build

### Docker runtime proof

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
- removes the complete Docker environment after the test

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

The production branch adds:

- `docker-compose.production.yml`
- Caddy automatic HTTPS configuration
- production standalone Next.js image build
- release-based deployment script
- database/uploads backup script
- automatic failed-deploy code rollback
- manual rollback script/workflow
- guarded GitHub Actions CD workflow

These files must pass CI before merge, but they are not reported as live production-verified until a VPS is provisioned and the first deployment completes successfully.

## Deliberately not claimed

- The smoke test does not query WooCommerce HPOS tables directly. Application and test code use WooCommerce CRUD APIs rather than depending on internal database storage.
- Browser-specific UI behaviour has not yet been covered by Playwright.
- Production HTTPS, DNS, backup restoration and rollback have not yet been executed on the target VPS.
- Cross-browser, accessibility and performance measurements remain future milestones.

No committed environment secrets are used, and no WordPress or WooCommerce core files are modified.
