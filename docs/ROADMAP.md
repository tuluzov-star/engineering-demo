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
- [ ] runtime verification against the Docker stack
- [ ] confirm order storage in HPOS tables on a running environment

## Phase 3 — Engineering depth

- [ ] PHPUnit for the WordPress plugin
- [ ] frontend component/unit tests
- [ ] Playwright end-to-end smoke tests
- [ ] structured logging
- [ ] health/readiness probes
- [ ] caching and revalidation strategy
- [ ] request throttling for public demo mutation endpoints

## Phase 4 — Delivery

- [ ] production Docker topology
- [ ] reverse proxy and HTTPS
- [ ] GitHub Actions deployment
- [ ] rollback workflow
- [ ] release tags and changelog

## Phase 5 — Portfolio proof

- [ ] architecture diagram
- [ ] short demo video
- [ ] public README screenshots
- [ ] documented trade-offs
- [ ] performance measurements
- [ ] one real business integration extracted from an existing WordPress/WooCommerce project
