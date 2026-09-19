# Architecture Diagram

```mermaid
flowchart TB
    Browser[Browser]

    subgraph Frontend[Next.js 16 / Node 24]
      RSC[Server Components\nCatalogue]
      BFF[BFF Route Handlers\nCart + Checkout]
      Health[Live / Ready]
      Logs[Structured JSON Logs]
    end

    subgraph Backend[WordPress + WooCommerce / PHP 8.3]
      Store[WooCommerce Store API]
      API[Engineering Demo API]
      WC[WooCommerce]
      HPOS[(MariaDB / HPOS)]
    end

    Browser --> RSC
    Browser --> BFF
    RSC -->|60s revalidation| Store
    BFF -->|HttpOnly Cart-Token\nvalidation / rate limit| Store
    Health --> API
    Store --> WC
    API --> WC
    WC --> HPOS
    BFF --> Logs

    subgraph Verification[CI verification]
      PHPUnit[PHPUnit]
      Vitest[Vitest]
      Smoke[Docker smoke]
      Playwright[Playwright + axe]
      Perf[Production performance budget]
    end

    PHPUnit --> API
    Vitest --> Frontend
    Smoke --> Backend
    Smoke --> Frontend
    Playwright --> Browser
    Perf --> Frontend

    subgraph Delivery[Prepared production delivery]
      Caddy[Caddy HTTPS]
      Deploy[GitHub Actions Deploy]
      Backup[DB + uploads backup]
      Rollback[Release rollback]
    end

    Deploy --> Caddy
    Backup --> Backend
    Rollback --> Frontend
    Rollback --> Backend
    Caddy --> Frontend
    Caddy --> Backend
```

## Trust boundaries

1. Browser input is untrusted.
2. Next.js BFF bounds/parses/validates mutation requests before forwarding.
3. WooCommerce remains authoritative for commerce rules.
4. Cart-Token stays server-side and is exposed to the browser only as an HttpOnly cookie.
5. Structured logs intentionally exclude checkout values, IP address and Cart-Token.
6. Database and application containers are not directly published in the prepared production topology.
