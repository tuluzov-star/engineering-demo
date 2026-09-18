#!/usr/bin/env sh
set -eu

DEPLOY_ROOT=${1:-}
KEEP_BACKUPS=${KEEP_BACKUPS:-7}

if [ -z "$DEPLOY_ROOT" ]; then
  printf '%s\n' 'Usage: backup-production.sh /absolute/deploy/root' >&2
  exit 64
fi

case "$DEPLOY_ROOT" in
  /*) ;;
  *)
    printf '%s\n' 'DEPLOY_ROOT must be an absolute path.' >&2
    exit 64
    ;;
esac

CURRENT_LINK="$DEPLOY_ROOT/current"
CURRENT_RELEASE=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)
ENV_FILE="$DEPLOY_ROOT/shared/.env.production"
BACKUP_ROOT="$DEPLOY_ROOT/backups"

if [ -z "$CURRENT_RELEASE" ] || [ ! -f "$CURRENT_RELEASE/docker-compose.production.yml" ]; then
  printf '%s\n' 'No active production release is available to back up.' >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  printf '%s\n' "Missing production environment file: $ENV_FILE" >&2
  exit 1
fi

timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
backup_dir="$BACKUP_ROOT/$timestamp"
mkdir -p "$backup_dir"

cd "$CURRENT_RELEASE"

compose() {
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml "$@"
}

printf '%s\n' "Creating production backup in $backup_dir"

compose exec -T db sh -c   'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb-dump --single-transaction --quick --lock-tables=false -uroot "$MARIADB_DATABASE"'   > "$backup_dir/database.sql"

compose exec -T wordpress sh -c   'cd /var/www/html/wp-content && if [ -d uploads ]; then tar -czf - uploads; else tar -czf - --files-from /dev/null; fi'   > "$backup_dir/uploads.tar.gz"

printf '%s\n' "$(basename "$CURRENT_RELEASE")" > "$backup_dir/release.txt"
(
  cd "$backup_dir"
  sha256sum database.sql uploads.tar.gz release.txt > SHA256SUMS
)

count=0
for old_backup in $(ls -1dt "$BACKUP_ROOT"/* 2>/dev/null || true); do
  count=$((count + 1))
  if [ "$count" -gt "$KEEP_BACKUPS" ]; then
    rm -rf "$old_backup"
  fi
done

printf '%s\n' "Backup complete: $backup_dir"
