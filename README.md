# Tuluzov Engineering Demo

A portfolio-grade headless commerce playground that connects a **WordPress + WooCommerce backend** to a **Next.js frontend/BFF**, runs locally with **Docker Compose**, and is prepared for **GitHub Actions CI/CD**.

The project is intentionally close to real production work: WooCommerce remains the commerce source of truth, WordPress is extended through a small public REST plugin rather than core modifications, and the frontend consumes supported APIs.

## What it demonstrates

- headless WooCommerce product catalogue
- Store API cart with add/update/remove operations
- server-side WooCommerce `Cart-Token` handling via an HttpOnly cookie
- Next.js Route Handlers used as a Backend-for-Frontend boundary
- checkout and WooCommerce order creation without a real payment transaction
- HPOS-aware WordPress/WooCommerce code and bootstrap
- reproducible local infrastructure and CI quality gates

## Stack

- WordPress 7.1.x
- WooCommerce 11.1.0
- PHP 8.3
- MariaDB 11.4
- Next.js 16.3.3 / React 19
- Node.js 24
- Docker Compose
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

The init script builds and starts the services, installs WordPress, installs and activates WooCommerce, enables HPOS for the new shop when required, configures the offline demo payment method, activates the custom demo API plugin, and seeds four virtual sample products.

Open:

- Next.js frontend: `http://localhost:3000`
- WordPress backend: `http://localhost:8080`
- backend health endpoint: `http://localhost:8080/wp-json/engineering-demo/v1/health`
- WooCommerce Store API: `http://localhost:8080/wp-json/wc/store/v1/products`

Before exposing the environment publicly, replace the demo credentials in `.env`.

## Cart and checkout architecture

The browser never receives the WooCommerce `Cart-Token` directly. It calls same-origin Next.js routes; the BFF talks to WooCommerce and stores the token in an `HttpOnly`, `SameSite=Lax` cookie.

```text
Browser -> Next.js BFF -> WooCommerce Store API -> WooCommerce order/HPOS
             |
             +-> HttpOnly cart-token cookie
```

Checkout uses WooCommerce's built-in offline `cheque` gateway with demo-only wording. **No real payment is collected.**

## Useful commands

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f wordpress
docker compose run --rm wp-cli /scripts/bootstrap-wp.sh
docker compose run --rm wp-cli wp wc hpos status --allow-root
docker compose down
```

`docker compose down` stops the environment but keeps data volumes. `docker compose down -v` also deletes the database and WordPress data and should only be used when a full reset is intended.

## Repository structure

```text
.
├── backend/
│   └── wp-content/plugins/engineering-demo-api/
├── frontend/
│   ├── src/app/api/cart/
│   ├── src/app/api/checkout/
│   ├── src/components/
│   └── src/lib/
├── scripts/
├── docs/
├── .github/workflows/ci.yml
└── docker-compose.yml
```

See `docs/ARCHITECTURE.md` for design decisions, `docs/ROADMAP.md` for implementation stages, and `docs/VALIDATION.md` for the exact verification status.

## CI

GitHub Actions checks:

- ESLint
- TypeScript
- Next.js production build
- PHP syntax
- shell script syntax
- Docker Compose configuration

Production deployment is intentionally not hard-coded yet. It will be added after the actual `demo.tuluzov.com` server topology and deployment access are confirmed.
