# Production deployment

## Target topology

The production target is a small Linux VPS with Docker Engine and the Docker Compose plugin.

Public hosts:

- `lab.tuluzov.com` — Next.js frontend/BFF
- `cms.lab.tuluzov.com` — WordPress/WooCommerce backend

Both hosts terminate TLS in Caddy. MariaDB is never published to the public network.

```text
Internet
   |
   v
Caddy :80/:443
   |----------------------|
   v                      v
lab.tuluzov.com           cms.lab.tuluzov.com
Next.js :3000             WordPress :80
   |                      |
   +------ backend -------+
              |
              v
          MariaDB
```

## Why the existing shared hosting is not the production target

The existing REG.RU shared-hosting account was inspected before deployment work.

Confirmed there:

- AlmaLinux 8.10
- Nginx + Apache
- PHP 8.2-8.5 and WP-CLI
- no usable Docker daemon for the hosting user
- system Node.js 10.24.0
- user-space Node.js 24 can execute
- Phusion Passenger 6.2.0 is installed
- the hosting-generated vhost is configured for Python Passenger
- attempting to switch the application type to Node from `.htaccess` is rejected with `PassengerAppType not allowed here`

A Python-to-Node proxy or an unmanaged background Node process would be possible only as a hosting workaround. The project deliberately does not use that architecture because it would add fragile infrastructure unrelated to the intended WordPress/Next.js/Docker engineering case.

`demo.tuluzov.com` remains the separate WordPress/WooCommerce plugin-demo site and is not modified by this project.

## VPS requirements

Recommended baseline for the demo:

- 2 vCPU
- 4 GB RAM preferred; 2 GB is the practical minimum
- 25+ GB SSD
- Ubuntu 24.04 LTS or Debian 12
- Docker Engine + Docker Compose plugin
- Git and curl
- inbound TCP 22, 80 and 443; UDP 443 is optional for HTTP/3

The repository is public, so production releases can be fetched without storing a GitHub deploy token on the server.

## DNS

After the VPS is provisioned, point these records to its public IP:

```text
lab.tuluzov.com      A     <VPS IPv4>
cms.lab.tuluzov.com  A     <VPS IPv4>
```

Do not repoint `demo.tuluzov.com`.

## Server directory layout

The deploy scripts expect an absolute deployment root, for example:

```text
/opt/engineering-demo/
├── backups/
├── current -> releases/<sha>/
├── releases/
│   └── <git-sha>/
└── shared/
    └── .env.production
```

Create the shared environment file from `.env.production.example` and replace every placeholder secret before the first deployment.

The file must stay outside the Git repository.

## Production Compose

`docker-compose.production.yml` provides:

- MariaDB 11.4 on an internal Docker network
- WordPress 7.1 / PHP 8.3
- WooCommerce bootstrap through WP-CLI
- HPOS enablement through supported WooCommerce CLI
- immutable Next.js standalone production image
- Caddy 2.11 with automatic HTTPS
- persistent database, WordPress and Caddy volumes
- no public database or application-container ports other than Caddy 80/443

## First manual deployment

Before enabling GitHub CD, the production environment can be verified manually from the VPS:

```bash
mkdir -p /opt/engineering-demo/shared
cp .env.production.example /opt/engineering-demo/shared/.env.production
# edit /opt/engineering-demo/shared/.env.production

sh scripts/deploy-production.sh /opt/engineering-demo <git-sha>
```

The deploy script:

1. fetches the exact Git commit into a release directory;
2. validates production Compose;
3. creates a pre-deployment database/uploads backup when an older release exists;
4. pulls infrastructure images;
5. builds the Next.js production image;
6. starts MariaDB and WordPress;
7. runs idempotent WP/WooCommerce bootstrap;
8. starts Next.js and waits for internal `/api/ready` readiness;
9. starts Caddy and validates public frontend and WordPress readiness endpoints over HTTPS;
10. moves the `current` symlink only after the release is healthy;
11. keeps a bounded number of old releases.

If activation fails after a previous release exists, the script attempts a code/container rollback automatically. Liveness endpoints remain available for diagnostics, while deployment promotion depends on readiness.

## GitHub Actions CD

Deployment is disabled by default.

Create a GitHub environment named `production` and configure:

Secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_PRIVATE_KEY`
- `DEPLOY_KNOWN_HOSTS`

Variables:

- `DEPLOY_ENABLED=true`
- `DEPLOY_ROOT=/opt/engineering-demo`
- `DEPLOY_PORT=22`

The SSH private key should belong to a dedicated unprivileged deploy user that can run Docker. The known-hosts value must be pinned from the actual VPS host key rather than disabling host-key verification.

Once `DEPLOY_ENABLED` is set, pushes to `main` use `.github/workflows/deploy.yml`.

## Rollback

Use the manual `Roll back production` GitHub Actions workflow, optionally supplying a retained release SHA.

Server-side equivalent:

```bash
sh scripts/rollback-production.sh /opt/engineering-demo
sh scripts/rollback-production.sh /opt/engineering-demo <release-sha>
```

Rollback recreates application containers from the selected code release while preserving Docker data volumes.

It does **not** roll back database contents. Pre-deployment database/uploads backups are stored under `<DEPLOY_ROOT>/backups/` for data recovery when that is explicitly required.

## Backup

Manual backup:

```bash
sh scripts/backup-production.sh /opt/engineering-demo
```

Each backup contains:

- `database.sql`
- `uploads.tar.gz`
- `release.txt`
- `SHA256SUMS`

The default retention is seven backups and can be changed through `KEEP_BACKUPS`.
