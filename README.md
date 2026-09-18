# Tuluzov Engineering Demo

A portfolio-grade headless commerce playground that connects a **WordPress + WooCommerce backend** to a **Next.js frontend**, runs locally with **Docker Compose**, and is prepared for **GitHub Actions CI/CD**.

The project is intentionally close to real production work: WooCommerce remains the commerce source of truth, WordPress is extended through a small public REST plugin rather than core modifications, and the frontend consumes supported APIs.

## Stack

- WordPress 7.1.x (official 7.1 image; current stable is 7.1.1)
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

The init script builds and starts the services, installs WordPress, installs and activates WooCommerce, activates the custom demo API plugin, and seeds four sample products.

Open:

- Next.js frontend: `http://localhost:3000`
- WordPress backend: `http://localhost:8080`
- backend health endpoint: `http://localhost:8080/wp-json/engineering-demo/v1/health`
- WooCommerce Store API: `http://localhost:8080/wp-json/wc/store/v1/products`

Before exposing the environment publicly, replace the demo credentials in `.env`.

## Useful commands

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f wordpress
docker compose run --rm wp-cli /scripts/bootstrap-wp.sh
docker compose down
```

`docker compose down` stops the environment but keeps data volumes. `docker compose down -v` also deletes the database and WordPress data and should only be used when a full reset is intended.

## Repository structure

```text
.
├── backend/
│   └── wp-content/plugins/engineering-demo-api/
├── frontend/
├── scripts/
├── docs/
├── .github/workflows/ci.yml
└── docker-compose.yml
```

See `docs/ARCHITECTURE.md` for design decisions, `docs/ROADMAP.md` for the next implementation stages, and `docs/VALIDATION.md` for the exact verification status.

## CI

The initial GitHub Actions workflow checks:

- ESLint
- TypeScript
- Next.js production build
- PHP syntax
- shell script syntax
- Docker Compose configuration

Production deployment is intentionally not hard-coded yet. It will be added after the actual `demo.tuluzov.com` server topology and deployment access are confirmed.
