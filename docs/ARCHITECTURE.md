# Architecture

## Goal

Build a portfolio-grade engineering demo around technologies that complement an existing WordPress/WooCommerce background rather than replacing it.

## Boundaries

- **WordPress** is the CMS and runtime host for WooCommerce.
- **WooCommerce** owns products, stock, pricing, cart rules, checkout and orders.
- **Engineering Demo API** adds only project-specific WordPress REST functionality. It does not patch WordPress or WooCommerce core.
- **Next.js** is both the public frontend and a small Backend-for-Frontend (BFF). Server Components read catalogue data, while same-origin Route Handlers proxy cart and checkout mutations.
- **MariaDB** stores WordPress/WooCommerce data.
- **WP-CLI** performs repeatable environment bootstrap, HPOS enablement, store configuration and demo data seeding.
- **Docker Compose** defines both local development and production service topology.
- **Caddy** is the production edge proxy and TLS terminator.
- **GitHub Actions** provides CI and guarded release-based deployment/rollback workflows.

## Local request flow

```text
Browser
  |
  | GET page / same-origin cart requests
  v
Next.js frontend + BFF :3000
  |                     |
  | Server Components   | Route Handlers
  |                     | + HttpOnly wc_cart_token cookie
  |                     | + bounded JSON parsing
  |                     | + per-client mutation throttling
  |                     v
  +---------------> WooCommerce Store API --------+
  |                                                |
  +---------------> Engineering Demo REST API -----+--> WordPress/WooCommerce :8080 --> MariaDB
```

## Production request flow

```text
Internet
   |
   v
Caddy :80/:443
   |------------------------------|
   v                              v
lab.tuluzov.com                   cms.lab.tuluzov.com
Next.js frontend + BFF :3000      WordPress/WooCommerce :80
   |                              |
   +---------- Docker backend ----+
                  |
                  v
               MariaDB
```

Only Caddy publishes host ports. MariaDB and application containers remain on Docker networks.

## Cart session design

WooCommerce Store API returns a `Cart-Token` for cart sessions. The demo intentionally does **not** expose this token to browser JavaScript.

1. The browser calls same-origin Next.js routes such as `/api/cart` and `/api/cart/items`.
2. Next.js obtains or reuses the WooCommerce `Cart-Token` server-side.
3. The token is stored in an `HttpOnly`, `SameSite=Lax` cookie.
4. Next.js forwards the token only in server-to-server calls to WooCommerce Store API.
5. Successful checkout clears the local cart-token cookie.

This BFF boundary is slightly more infrastructure than calling WooCommerce directly from the browser, but it keeps commerce-session details out of client JavaScript and gives one place for validation, logging, rate limiting and future authentication concerns.

## Mutation boundary hardening

The BFF treats public cart/checkout mutation routes as a separate trust boundary.

- JSON request bodies are read as bounded text before parsing.
- malformed JSON returns 400 rather than falling into a generic server error;
- oversized bodies return 413;
- cart mutations are limited to 40 requests per minute per derived client address;
- checkout is limited to 8 attempts per 10 minutes per derived client address;
- rate-limit metadata is returned in response headers;
- checkout normalization/validation is implemented as a pure tested module before data is forwarded to WooCommerce;
- WooCommerce still remains the authoritative commerce validator.

The current limiter stores buckets in the Next.js process. That is an intentional trade-off for this single-instance demo. If the frontend is scaled to multiple replicas, rate-limit state must move to shared infrastructure such as Redis/KV.

## Checkout design

- Seeded products are virtual so the demo does not depend on shipping-zone configuration.
- Checkout uses WooCommerce's built-in offline `cheque` gateway with demo-specific copy; no real payment is collected.
- Checkout fields are validated both in the browser and again in the Next.js Route Handler.
- WooCommerce remains responsible for authoritative checkout validation and order creation.
- HPOS is enabled through the supported `wp wc hpos enable` command when required.

## Test architecture

The test pyramid currently has three layers:

1. **Vitest unit tests** for pure validation, request parsing and rate-limit behaviour.
2. **API/Docker smoke test** for Store API cart, checkout, WooCommerce order creation and HPOS-enabled CRUD retrieval.
3. **Playwright Chromium tests** against the live Docker stack for the real browser cart and checkout interaction.

Browser test traces, screenshots and video are retained only when the Playwright job fails.

## Production deployment design

Production uses immutable code releases plus persistent Docker volumes.

```text
/opt/engineering-demo/
├── backups/
├── current -> releases/<sha>/
├── releases/<sha>/
└── shared/.env.production
```

The deploy workflow:

1. fetches the exact Git SHA into a release directory;
2. validates production Compose;
3. creates a pre-deployment database/uploads backup after the first release;
4. builds the Next.js standalone image;
5. starts MariaDB and WordPress;
6. runs the idempotent WP-CLI bootstrap;
7. starts and checks Next.js;
8. starts Caddy and verifies public HTTPS health;
9. advances the `current` symlink only after health checks pass;
10. keeps a bounded set of previous releases.

A failed release attempts to restore the previous code/container release. Data volumes are not automatically reverted.

## Hosting decision

The existing REG.RU shared-hosting account was inspected before production topology was selected.

Confirmed constraints include:

- no usable Docker daemon for the hosting user;
- system Node.js 10.24.0;
- user-space Node.js 24 can execute;
- Passenger 6.2.0 is installed, but the generated vhost is configured for Python;
- attempting `PassengerAppType node` in `.htaccess` is rejected by Apache as not allowed.

The project therefore does not use shared-hosting workarounds such as a Python-to-Node bridge or unmanaged background Node process. A small VPS preserves the intended Docker/Next.js architecture and keeps deployment reproducible.

`demo.tuluzov.com` remains the separate plugin-demo environment. The engineering demo uses `lab.tuluzov.com` and `cms.lab.tuluzov.com`.

## Security choices

- No secrets are committed; local and production environment files are ignored.
- The custom WordPress REST endpoint is read-only and exposes only non-sensitive runtime metadata.
- Cart and checkout use supported WooCommerce Store API endpoints.
- Cart tokens are not persisted in local storage and are not readable by client JavaScript.
- Next.js bounds, validates and rate-limits public mutation requests before forwarding them.
- MariaDB has no public host port in production.
- WordPress and Next.js are exposed only through Caddy.
- Caddy terminates HTTPS and adds baseline security headers.
- SSH host-key verification stays enabled in GitHub Actions.
- Deployment credentials live in the GitHub production environment, not in the repository.
- No WordPress/WooCommerce core files are modified.

## Next technical milestones

1. Add structured server logging without customer PII.
2. Separate liveness/readiness semantics and improve health probes.
3. Add component tests and accessibility checks.
4. Define the catalogue caching/revalidation strategy.
5. Provision the production VPS when the deployment account is ready.
