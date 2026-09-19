# Changelog

All notable engineering milestones for this demo are documented here.

The repository is still pre-1.0 because the live VPS deployment and public portfolio capture are intentionally pending.

## [Unreleased]

### Planned

- live VPS deployment to `lab.tuluzov.com` / `cms.lab.tuluzov.com`
- public screenshots and short demo video
- one extracted real-world WordPress/WooCommerce integration
- first tagged portfolio release

## [0.3.0] - 2026-09-19

### Added

- 7 PHPUnit 11.5 plugin contract tests with 38 assertions
- production Docker performance budget and CI JSON artifact
- React Testing Library component tests
- Playwright Chromium commerce E2E coverage
- axe-core automated WCAG A/AA checks
- structured JSON BFF logging with request IDs
- separate WordPress and Next.js liveness/readiness endpoints
- bounded JSON parsing and public mutation rate limiting
- 60-second catalogue revalidation strategy
- portfolio case study and architecture diagrams

### Verified

Recorded GitHub Actions performance measurement:

- TTFB ~227 ms
- LCP 352 ms
- CLS 0
- load event ~367 ms
- total encoded transfer 149,759 bytes
- JavaScript transfer 134,413 bytes
- 129 DOM nodes

These values are CI regression measurements, not real-user field metrics.

## [0.2.0] - 2026-09-19

### Added

- production Docker Compose topology
- Caddy HTTPS/reverse-proxy configuration
- Git-SHA release directories
- guarded GitHub Actions deployment workflow
- pre-deployment database/uploads backup
- automatic failed-deploy code rollback
- manual rollback workflow
- production deployment documentation

### Hosting decision

The existing shared-hosting environment was inspected and rejected as the modern Next.js production target rather than being forced into a provider-specific Node workaround.

## [0.1.0] - 2026-09-19

### Added

- WordPress + WooCommerce + MariaDB Docker stack
- Next.js 16 / React 19 frontend
- WooCommerce Store API catalogue
- BFF cart and checkout
- server-side Cart-Token handling via HttpOnly cookie
- WooCommerce order creation with HPOS enabled
- custom Engineering Demo API plugin
- seeded virtual demo products
- automated Docker cart/checkout/HPOS smoke test
