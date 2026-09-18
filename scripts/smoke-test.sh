#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

WORDPRESS_URL=${SMOKE_WORDPRESS_URL:-http://localhost:8080}
FRONTEND_URL=${SMOKE_FRONTEND_URL:-http://localhost:3000}

for command_name in curl jq docker; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s\n' "Required command is missing: $command_name" >&2
    exit 1
  fi
done

request_with_retry() {
  curl     --fail     --silent     --show-error     --retry 30     --retry-delay 2     --retry-all-errors     "$@"
}

printf '%s\n' 'Checking WordPress/WooCommerce health...'
health=$(request_with_retry "$WORDPRESS_URL/wp-json/engineering-demo/v1/health")
printf '%s' "$health" | jq -e '.status == "ok" and .hpos_enabled == true' >/dev/null

printf '%s\n' 'Checking seeded WooCommerce products...'
products=$(request_with_retry "$WORDPRESS_URL/wp-json/wc/store/v1/products?per_page=8")
product_id=$(printf '%s' "$products" | jq -er 'if length >= 4 then .[0].id else error("Expected at least four seeded products") end')

printf '%s\n' 'Checking Next.js frontend...'
request_with_retry "$FRONTEND_URL" >/dev/null

cookie_jar=$(mktemp)
trap 'rm -f "$cookie_jar"' EXIT

printf '%s\n' 'Creating Store API cart session through the Next.js BFF...'
cart=$(request_with_retry -c "$cookie_jar" -b "$cookie_jar" "$FRONTEND_URL/api/cart")
printf '%s' "$cart" | jq -e '.items_count == 0' >/dev/null

printf '%s\n' "Adding product $product_id to the cart..."
cart=$(request_with_retry   -c "$cookie_jar"   -b "$cookie_jar"   -H 'Content-Type: application/json'   -X POST   --data "{\"id\":$product_id,\"quantity\":2}"   "$FRONTEND_URL/api/cart/items")
printf '%s' "$cart" | jq -e '.items_count == 2 and (.items | length) == 1' >/dev/null

printf '%s\n' 'Creating WooCommerce order through Store API checkout...'
checkout=$(request_with_retry   -c "$cookie_jar"   -b "$cookie_jar"   -H 'Content-Type: application/json'   -X POST   --data '{
    "first_name":"CI",
    "last_name":"Smoke",
    "email":"ci-smoke@example.com",
    "phone":"",
    "address_1":"550 Central Park West",
    "address_2":"",
    "city":"New York",
    "state":"NY",
    "postcode":"10023",
    "country":"US",
    "customer_note":"Automated engineering-demo smoke test."
  }'   "$FRONTEND_URL/api/checkout")

order_id=$(printf '%s' "$checkout" | jq -er '.order_id')

case "$order_id" in
  ''|*[!0-9]*)
    printf '%s\n' 'Checkout did not return a numeric order_id.' >&2
    exit 1
    ;;
esac

printf '%s\n' "Verifying WooCommerce order $order_id with HPOS enabled..."
docker compose run --rm -e ORDER_ID="$order_id" wp-cli -c 'wp eval-file /scripts/verify-order.php --allow-root'

printf '%s\n' "Integration smoke test passed. Order ID: $order_id"
