# Engineering Demo Roadmap

## Phase 1 — Foundation

- [x] WordPress + WooCommerce backend
- [x] custom read-only REST endpoint
- [x] Next.js 16 App Router frontend
- [x] WooCommerce Store API product catalogue
- [x] repeatable demo product seeding
- [x] Docker Compose local environment
- [x] CI quality gate

## Phase 2 — Commerce flow

- [x] Store API cart through a Next.js BFF
- [x] add/remove/update line items
- [x] server-side Cart-Token handling with HttpOnly cookie
- [x] checkout form and server-side input validation
- [x] Store API order creation using an offline demo payment gateway
- [x] HPOS bootstrap command and runtime health visibility
- [x] cart/checkout error states
- [x] runtime verification against the Docker stack
- [x] automated checkout order verification through WooCommerce CRUD with HPOS enabled

## Phase 3 — Engineering depth

- [x] isolated PHPUnit contract tests for the WordPress plugin
- [x] frontend unit tests
- [x] frontend component tests
- [x] Playwright end-to-end smoke tests
- [x] automated WCAG A/AA checks for catalogue and checkout state
- [x] structured JSON logging for BFF commerce routes without checkout PII
- [x] separate liveness/readiness probes for WordPress and Next.js
- [x] catalogue caching and revalidation strategy
- [x] request throttling for public demo mutation endpoints
- [x] bounded JSON parsing and explicit malformed/oversized request errors

## Phase 4 — Delivery

- [x] production Docker topology
- [x] Caddy reverse proxy and automatic HTTPS configuration
- [x] release-based GitHub Actions deployment workflow
- [x] automatic pre-deployment database/uploads backup
- [x] automatic failed-deploy code rollback
- [x] manual rollback workflow
- [ ] provision production VPS
- [ ] point `lab.tuluzov.com` and `cms.lab.tuluzov.com` to VPS
- [ ] first live production deployment
- [ ] enable guarded CD after first manual verification
- [x] changelog
- [x] release tag `v0.3.0`

## Phase 5 — Portfolio proof

- [x] architecture diagram
- [ ] short demo video
- [x] public README screenshots
- [x] documented trade-offs
- [x] performance measurements and budgets
- [ ] one real business integration extracted from an existing WordPress/WooCommerce project
