#!/usr/bin/env sh
set -eu

DEPLOY_ROOT=${1:-}
RELEASE_SHA=${2:-}
REPO_URL=${3:-https://github.com/tuluzov-star/engineering-demo.git}
KEEP_RELEASES=${KEEP_RELEASES:-5}

if [ -z "$DEPLOY_ROOT" ] || [ -z "$RELEASE_SHA" ]; then
  printf '%s\n' 'Usage: deploy-production.sh /absolute/deploy/root <git-sha> [repo-url]' >&2
  exit 64
fi

case "$DEPLOY_ROOT" in
  /*) ;;
  *)
    printf '%s\n' 'DEPLOY_ROOT must be an absolute path.' >&2
    exit 64
    ;;
esac

if ! printf '%s' "$RELEASE_SHA" | grep -Eq '^[0-9a-f]{7,40}$'; then
  printf '%s\n' 'Release SHA must contain 7-40 lowercase hexadecimal characters.' >&2
  exit 64
fi

for command_name in git docker curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s\n' "Required command is missing: $command_name" >&2
    exit 1
  fi
done

docker compose version >/dev/null

SHARED_DIR="$DEPLOY_ROOT/shared"
RELEASES_DIR="$DEPLOY_ROOT/releases"
CURRENT_LINK="$DEPLOY_ROOT/current"
ENV_FILE="$SHARED_DIR/.env.production"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_SHA"
PREVIOUS_RELEASE=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)

if [ ! -f "$ENV_FILE" ]; then
  printf '%s\n' "Missing production environment file: $ENV_FILE" >&2
  printf '%s\n' 'Create it from .env.production.example before the first deployment.' >&2
  exit 1
fi

mkdir -p "$SHARED_DIR" "$RELEASES_DIR"

if [ ! -d "$RELEASE_DIR/.git" ]; then
  git clone --filter=blob:none --no-checkout "$REPO_URL" "$RELEASE_DIR"
fi

cd "$RELEASE_DIR"
git fetch --depth=1 origin "$RELEASE_SHA"
git checkout --force --detach FETCH_HEAD
ln -sfn "$ENV_FILE" .env.production

compose() {
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml "$@"
}

read_env_value() {
  key=$1
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

wait_for_internal_health() {
  attempts=0
  until compose exec -T frontend node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      printf '%s\n' 'Frontend internal health check did not become ready.' >&2
      return 1
    fi
    sleep 2
  done
}

wait_for_public_health() {
  frontend_host=$(read_env_value FRONTEND_HOST)
  wordpress_host=$(read_env_value WORDPRESS_HOST)

  if [ -z "$frontend_host" ] || [ -z "$wordpress_host" ]; then
    printf '%s\n' 'FRONTEND_HOST and WORDPRESS_HOST must be set in .env.production.' >&2
    return 1
  fi

  attempts=0
  until curl --fail --silent --show-error --max-time 10       "https://$frontend_host/api/health" >/dev/null     && curl --fail --silent --show-error --max-time 10       "https://$wordpress_host/wp-json/engineering-demo/v1/health" >/dev/null; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      printf '%s\n' 'Public HTTPS health checks did not become ready.' >&2
      return 1
    fi
    sleep 4
  done
}

activate_release() {
  release_path=$1
  cd "$release_path"
  ln -sfn "$ENV_FILE" .env.production

  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml config --quiet
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml pull db wordpress wp-cli caddy
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml build --pull frontend
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml up -d db wordpress
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml run --rm wp-cli /scripts/bootstrap-wp.sh
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml up -d frontend
  wait_for_internal_health
  docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml up -d caddy
  wait_for_public_health
}

rollback_previous() {
  if [ -z "$PREVIOUS_RELEASE" ] || [ ! -f "$PREVIOUS_RELEASE/docker-compose.production.yml" ]; then
    printf '%s\n' 'No previous release is available for automatic code rollback.' >&2
    return 0
  fi

  printf '%s\n' "Deployment failed; restoring previous release: $PREVIOUS_RELEASE" >&2
  set +e
  activate_release "$PREVIOUS_RELEASE"
  rollback_status=$?
  if [ "$rollback_status" -eq 0 ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    printf '%s\n' 'Previous release restored.' >&2
  else
    printf '%s\n' 'Automatic rollback also failed; manual intervention is required.' >&2
  fi
  set -e
}

on_exit() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$status" -ne 0 ]; then
    rollback_previous
  fi
  exit "$status"
}

trap on_exit EXIT HUP INT TERM

if [ -n "$PREVIOUS_RELEASE" ] && [ -f "$PREVIOUS_RELEASE/docker-compose.production.yml" ]; then
  printf '%s\n' 'Creating a pre-deployment database/uploads backup...'
  sh "$RELEASE_DIR/scripts/backup-production.sh" "$DEPLOY_ROOT"
fi

printf '%s\n' "Deploying release $RELEASE_SHA..."
activate_release "$RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

count=0
for old_release in $(ls -1dt "$RELEASES_DIR"/* 2>/dev/null || true); do
  count=$((count + 1))
  if [ "$count" -gt "$KEEP_RELEASES" ] && [ "$(readlink -f "$old_release")" != "$(readlink -f "$CURRENT_LINK")" ]; then
    rm -rf "$old_release"
  fi
done

trap - EXIT HUP INT TERM
printf '%s\n' "Deployment complete: $RELEASE_SHA"
