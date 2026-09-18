# Validation status

## Confirmed in the preparation environment

- PHP syntax: `engineering-demo-api.php`
- PHP syntax: `seed-products.php`
- shell syntax: `bootstrap-wp.sh`
- shell syntax: `init.sh`
- JSON parsing: `package.json`, `tsconfig.json`
- YAML parsing: `docker-compose.yml`, `.github/workflows/ci.yml`
- TypeScript/TSX syntax transpilation for the frontend source files
- no `!important` declarations in the project

## Not yet runtime-verified

The preparation environment does not provide Docker, so the following must be verified on a machine with Docker Desktop / Docker Engine:

- pulling and starting all container images
- WordPress bootstrap against MariaDB
- WooCommerce installation and activation through WP-CLI
- demo product seeding against the running WooCommerce version
- frontend dependency installation
- ESLint and full TypeScript type-check with installed Next.js/React packages
- Next.js production build
- live Store API rendering through the Docker network

These checks are intentionally listed as pending rather than reported as completed.
