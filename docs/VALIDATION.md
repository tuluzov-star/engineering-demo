# Validation status

This file deliberately separates static checks from runtime proof. A code path is not reported as runtime-tested until it has actually run against the Docker stack.

## Confirmed in the preparation environment

- PHP syntax: `engineering-demo-api.php`
- PHP syntax: `seed-products.php`
- PHP syntax: `configure-store.php`
- shell syntax: `bootstrap-wp.sh`
- shell syntax: `init.sh`
- JSON parsing: `package.json`, `tsconfig.json`
- YAML parsing: `docker-compose.yml`, `.github/workflows/ci.yml`
- TypeScript/TSX syntax transpilation for the frontend source files
- no `!important` declarations in the project
- no committed `.env` secrets

## Implemented but not yet runtime-verified

- Store API Cart-Token acquisition
- HttpOnly cookie persistence in the Next.js BFF
- add/update/remove cart item flow
- checkout request and order creation
- offline `cheque` gateway configuration
- HPOS enablement through WooCommerce CLI
- order creation in HPOS tables

## Environment checks still required

The preparation environment does not provide Docker, so the following must be verified on a machine with Docker Desktop / Docker Engine:

- pulling and starting all container images
- WordPress bootstrap against MariaDB
- WooCommerce installation and activation through WP-CLI
- HPOS enablement/status
- demo store configuration and virtual product seeding
- frontend dependency installation
- ESLint and full TypeScript type-check with installed Next.js/React packages
- Next.js production build
- live catalogue rendering through the Docker network
- add/update/remove cart actions
- successful checkout and order creation
- resulting order visibility in WooCommerce admin and HPOS storage

These checks are intentionally listed as pending rather than reported as completed.
