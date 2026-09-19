#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend"
PERFORMANCE_PORT=${PERFORMANCE_PORT:-3001}
PERFORMANCE_BASE_URL=${PERFORMANCE_BASE_URL:-http://127.0.0.1:$PERFORMANCE_PORT}
NEXT_PUBLIC_WORDPRESS_URL=${NEXT_PUBLIC_WORDPRESS_URL:-http://127.0.0.1:8080}
PERFORMANCE_IMAGE=${PERFORMANCE_IMAGE:-engineering-demo-performance:local}
PERFORMANCE_CONTAINER="engineering-demo-performance-$$"
LOG_FILE="$ROOT_DIR/performance-next.log"

for command_name in curl docker npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s\n' "Required command is missing: $command_name" >&2
    exit 1
  fi
done

cd "$ROOT_DIR"
docker compose version >/dev/null

wordpress_container=$(docker compose ps -q wordpress)

if [ -z "$wordpress_container" ]; then
  printf '%s\n' 'The WordPress Docker service must be running before performance tests.' >&2
  exit 1
fi

compose_networks=$(docker inspect "$wordpress_container" --format '{{range $name, $config := .NetworkSettings.Networks}}{{$name}} {{end}}')
set -- $compose_networks
compose_network=${1:-}

if [ -z "$compose_network" ]; then
  printf '%s\n' 'Could not determine the Docker network used by WordPress.' >&2
  exit 1
fi

cleanup() {
  docker logs "$PERFORMANCE_CONTAINER" > "$LOG_FILE" 2>&1 || true
  docker rm -f "$PERFORMANCE_CONTAINER" >/dev/null 2>&1 || true
  docker image rm "$PERFORMANCE_IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

printf '%s\n' 'Building the production frontend Docker target for performance measurement...'
docker build \
  --target production \
  --build-arg "NEXT_PUBLIC_WORDPRESS_URL=$NEXT_PUBLIC_WORDPRESS_URL" \
  -t "$PERFORMANCE_IMAGE" \
  "$FRONTEND_DIR"

printf '%s\n' "Starting production frontend container on $PERFORMANCE_BASE_URL..."
docker run -d \
  --name "$PERFORMANCE_CONTAINER" \
  --network "$compose_network" \
  -p "$PERFORMANCE_PORT:3000" \
  -e WORDPRESS_INTERNAL_URL=http://wordpress \
  -e "NEXT_PUBLIC_WORDPRESS_URL=$NEXT_PUBLIC_WORDPRESS_URL" \
  "$PERFORMANCE_IMAGE" >/dev/null

attempt=0
until curl --fail --silent --show-error --max-time 5 "$PERFORMANCE_BASE_URL/api/ready" >/dev/null 2>&1; do
  attempt=$((attempt + 1))

  if [ "$attempt" -ge 30 ]; then
    printf '%s\n' 'Production frontend performance container did not become ready.' >&2
    docker logs "$PERFORMANCE_CONTAINER" >&2 || true
    exit 1
  fi

  sleep 1
done

cd "$FRONTEND_DIR"

printf '%s\n' 'Running production performance budget...'
PERFORMANCE_BASE_URL="$PERFORMANCE_BASE_URL" npm run performance

printf '%s\n' 'Measured performance:'
cat "$FRONTEND_DIR/performance-results.json"
