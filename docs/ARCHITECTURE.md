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
- **Docker Compose** defines the local development topology.
- **GitHub Actions** is the first quality gate. Deployment is deliberately a separate phase because the target server is not yet confirmed.

## Request flow

```text
Browser
  |
  | GET page / same-origin cart requests
  v
Next.js frontend + BFF :3000
  |                     |
  | Server Components   | Route Handlers
  |                     | + HttpOnly wc_cart_token cookie
  |                     v
  +---------------> WooCommerce Store API --------+
  |                                                |
  +---------------> Engineering Demo REST API -----+--> WordPress/WooCommerce :8080 --> MariaDB
```

## Cart session design

WooCommerce Store API returns a `Cart-Token` for cart sessions. The demo intentionally does **not** expose this token to browser JavaScript.

1. The browser calls same-origin Next.js routes such as `/api/cart` and `/api/cart/items`.
2. Next.js obtains or reuses the WooCommerce `Cart-Token` server-side.
3. The token is stored in an `HttpOnly`, `SameSite=Lax` cookie.
4. Next.js forwards the token only in server-to-server calls to WooCommerce Store API.
5. Successful checkout clears the local cart-token cookie.

This BFF boundary is slightly more infrastructure than calling WooCommerce directly from the browser, but it keeps commerce-session details out of client JavaScript and gives one place for validation, logging, rate limiting and future authentication concerns.

## Checkout design

- Seeded products are virtual so the demo does not depend on shipping-zone configuration.
- Checkout uses WooCommerce's built-in offline `cheque` gateway with demo-specific copy; no real payment is collected.
- Checkout fields are validated both in the browser and again in the Next.js Route Handler.
- WooCommerce remains responsible for authoritative checkout validation and order creation.
- HPOS is enabled through the supported `wp wc hpos enable --for-new-shop` command when required.

## Security choices

- No secrets are committed; `.env` is ignored.
- The custom WordPress REST endpoint is read-only and exposes only non-sensitive runtime metadata.
- Cart and checkout use supported WooCommerce Store API endpoints.
- Cart tokens are not persisted in local storage and are not readable by client JavaScript.
- Next.js validates basic request shape before forwarding mutations.
- No WordPress/WooCommerce core files are modified.
- Deployment credentials will live in the CI/CD secret store, not in the repository.

## Next technical milestones

1. Runtime-verify cart, checkout and HPOS against the Docker stack.
2. Add automated integration tests against the Docker stack.
3. Add frontend component tests and Playwright smoke coverage.
4. Add production reverse proxy and TLS topology for `demo.tuluzov.com`.
5. Add deployment workflow after the actual hosting target and SSH/container capabilities are confirmed.
