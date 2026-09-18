# Architecture

## Goal

Build a portfolio-grade engineering demo around technologies that complement an existing WordPress/WooCommerce background rather than replacing it.

## Boundaries

- **WordPress** is the CMS and runtime host for WooCommerce.
- **WooCommerce** owns products, stock, pricing and future checkout/order flows.
- **Engineering Demo API** adds only project-specific WordPress REST functionality. It does not patch WordPress or WooCommerce core.
- **Next.js** is the public frontend. Server Components call the WooCommerce Store API and the custom health endpoint.
- **MariaDB** stores WordPress/WooCommerce data.
- **WP-CLI** performs repeatable environment bootstrap and demo data seeding.
- **Docker Compose** defines the local development topology.
- **GitHub Actions** is the first quality gate. Deployment is deliberately a separate phase because the target server is not yet known.

## Request flow

```text
Browser
  |
  v
Next.js frontend :3000
  |
  +--> WooCommerce Store API ------+
  |                                |
  +--> Engineering Demo REST API --+--> WordPress/WooCommerce :8080 --> MariaDB
```

## Security choices

- No secrets are committed; `.env` is ignored.
- The custom REST endpoint is read-only and exposes only non-sensitive runtime metadata.
- WooCommerce remains behind its supported public Store/REST APIs.
- No WordPress/WooCommerce core files are modified.
- Deployment credentials will live in the CI/CD secret store, not in the repository.

## Next technical milestones

1. Add Store API cart flow and token/nonce handling.
2. Add checkout/order flow and verify HPOS behaviour.
3. Add automated integration tests against the Docker stack.
4. Add production reverse proxy and TLS topology for `demo.tuluzov.com`.
5. Add deployment workflow after the actual hosting target and SSH/container capabilities are confirmed.
