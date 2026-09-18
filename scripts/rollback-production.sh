#!/usr/bin/env sh
set -eu

DEPLOY_ROOT=${1:-}
TARGET_SHA=${2:-}

if [ -z "$DEPLOY_ROOT" ]; then
  printf '%s\n' 'Usage: rollback-production.sh /absolute/deploy/root [release-sha]' >&2
  exit 64
fi

case "$DEPLOY_ROOT" in
  /*) ;;
  *)
    printf '%s\n' 'DEPLOY_ROOT must be an absolute path.' >&2
    exit 64
    ;;
esac

SHARED_DIR="$DEPLOY_ROOT/shared"
RELEASES_DIR="$DEPLOY_ROOT/releases"
CURRENT_LINK="$DEPLOY_ROOT/current"
ENV_FILE="$SHARED_DIR/.env.production"
CURRENT_RELEASE=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)

if [ ! -f "$ENV_FILE" ]; then
  printf '%s\n' "Missing production environment file: $ENV_FILE" >&2
  exit 1
fi

if [ -n "$TARGET_SHA" ]; then
  if ! printf '%s' "$TARGET_SHA" | grep -Eq '^[0-9a-f]{7,40}$'; then
    printf '%s\n' 'Release SHA must contain 7-40 lowercase hexadecimal characters.' >&2
    exit 64
  fi
  TARGET_RELEASE="$RELEASES_DIR/$TARGET_SHA"
else
  TARGET_RELEASE=
  for candidate in $(ls -1dt "$RELEASES_DIR"/* 2>/dev/null || true); do
    if [ "$(readlink -f "$candidate")" != "$CURRENT_RELEASE" ]; then
      TARGET_RELEASE=$candidate
      break
    fi
  done
fi

if [ -z "${TARGET_RELEASE:-}" ] || [ ! -f "$TARGET_RELEASE/docker-compose.production.yml" ]; then
  printf '%s\n' 'Requested rollback release was not found.' >&2
  exit 1
fi

cd "$TARGET_RELEASE"
ln -sfn "$ENV_FILE" .env.production

compose() {
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml "$@"
}

printf '%s\n' "Rolling back application code to: $TARGET_RELEASE"
printf '%s\n' 'Database volumes are preserved; this script performs a code/container rollback only.'

compose config --quiet
compose build --pull frontend
compose up -d db wordpress
compose run --rm wp-cli /scripts/bootstrap-wp.sh
compose up -d frontend

attempts=0
until compose exec -T frontend node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    printf '%s\n' 'Rolled-back frontend did not become healthy.' >&2
    exit 1
  fi
  sleep 2
done

compose up -d caddy
ln -sfn "$TARGET_RELEASE" "$CURRENT_LINK"

printf '%s\n' "Rollback complete: $(basename "$TARGET_RELEASE")"
