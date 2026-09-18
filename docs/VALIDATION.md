# Validation status

This file deliberately separates static checks from runtime proof. A code path is not reported as runtime-tested until it has actually run against the Docker stack.

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

## Deliberately not claimed

- The smoke test does not query WooCommerce HPOS tables directly. Application and test code use WooCommerce CRUD APIs rather than depending on internal database storage.
- Browser-specific UI behaviour has not yet been covered by Playwright.
- Production deployment to `demo.tuluzov.com` has not yet been configured or verified.
- Cross-browser, accessibility and performance measurements remain future milestones.

No committed `.env` secrets are used, and no WordPress or WooCommerce core files are modified.
