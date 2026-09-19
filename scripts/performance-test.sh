#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend"
PERFORMANCE_PORT=${PERFORMANCE_PORT:-3001}
PERFORMANCE_BASE_URL=${PERFORMANCE_BASE_URL:-http://127.0.0.1:$PERFORMANCE_PORT}
WORDPRESS_INTERNAL_URL=${WORDPRESS_INTERNAL_URL:-http://127.0.0.1:8080}
NEXT_PUBLIC_WORDPRESS_URL=${NEXT_PUBLIC_WORDPRESS_URL:-http://127.0.0.1:8080}

for command_name in curl node npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s\n' "Required command is missing: $command_name" >&2
    exit 1
  fi
done

cd "$FRONTEND_DIR"

export WORDPRESS_INTERNAL_URL
export NEXT_PUBLIC_WORDPRESS_URL

printf '%s\n' 'Building production Next.js standalone output for performance measurement...'
npm run build

rm -rf .next/standalone/.next/static .next/standalone/public
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public

printf '%s\n' "Starting production Next.js on $PERFORMANCE_BASE_URL..."
HOSTNAME=127.0.0.1 PORT="$PERFORMANCE_PORT" \
  WORDPRESS_INTERNAL_URL="$WORDPRESS_INTERNAL_URL" \
  NEXT_PUBLIC_WORDPRESS_URL="$NEXT_PUBLIC_WORDPRESS_URL" \
  node .next/standalone/server.js > "$ROOT_DIR/performance-next.log" 2>&1 &
server_pid=$!

cleanup() {
  kill "$server_pid" >/dev/null 2>&1 || true
  wait "$server_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

attempt=0
until curl --fail --silent --show-error --max-time 5 "$PERFORMANCE_BASE_URL/api/ready" >/dev/null 2>&1; do
  attempt=$((attempt + 1))

  if [ "$attempt" -ge 30 ]; then
    printf '%s\n' 'Production Next.js performance server did not become ready.' >&2
    cat "$ROOT_DIR/performance-next.log" >&2 || true
    exit 1
  fi

  sleep 1
done

printf '%s\n' 'Running production performance budget...'
PERFORMANCE_BASE_URL="$PERFORMANCE_BASE_URL" npm run performance

printf '%s\n' 'Measured performance:'
cat "$FRONTEND_DIR/performance-results.json"
