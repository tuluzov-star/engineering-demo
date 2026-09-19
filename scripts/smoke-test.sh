#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

WORDPRESS_URL=${SMOKE_WORDPRESS_URL:-http://localhost:8080}
FRONTEND_URL=${SMOKE_FRONTEND_URL:-http://localhost:3000}

for command_name in curl jq docker grep; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s\n' "Required command is missing: $command_name" >&2
    exit 1
  fi
done

request_with_retry() {
  curl \
    --fail \
    --silent \
    --show-error \
    --retry 30 \
    --retry-delay 2 \
    --retry-all-errors \
    "$@"
}

printf '%s\n' 'Checking WordPress liveness...'
wordpress_live=$(request_with_retry "$WORDPRESS_URL/wp-json/engineering-demo/v1/live")
printf '%s' "$wordpress_live" | jq -e '.status == "ok" and .service == "wordpress"' >/dev/null

printf '%s\n' 'Checking WordPress/WooCommerce readiness...'
wordpress_ready=$(request_with_retry "$WORDPRESS_URL/wp-json/engineering-demo/v1/ready")
printf '%s' "$wordpress_ready" | jq -e '
  .status == "ready"
  and .hpos_enabled == true
  and .checks.database == true
  and .checks.woocommerce == true
  and .checks.hpos == true
' >/dev/null

printf '%s\n' 'Checking frontend liveness...'
frontend_live=$(request_with_retry "$FRONTEND_URL/api/live")
printf '%s' "$frontend_live" | jq -e '.status == "ok" and .service == "engineering-demo-frontend"' >/dev/null

printf '%s\n' 'Checking frontend readiness...'
frontend_ready=$(request_with_retry "$FRONTEND_URL/api/ready")
printf '%s' "$frontend_ready" | jq -e '
  .status == "ready"
  and .checks.backend == true
  and .checks.store_api == true
' >/dev/null

printf '%s\n' 'Checking backward-compatible health endpoints...'
wordpress_health=$(request_with_retry "$WORDPRESS_URL/wp-json/engineering-demo/v1/health")
printf '%s' "$wordpress_health" | jq -e '.status == "ok" and .hpos_enabled == true' >/dev/null
frontend_health=$(request_with_retry "$FRONTEND_URL/api/health")
printf '%s' "$frontend_health" | jq -e '.status == "ok"' >/dev/null

printf '%s\n' 'Checking seeded WooCommerce products...'
products=$(request_with_retry "$WORDPRESS_URL/wp-json/wc/store/v1/products?per_page=8")
product_id=$(printf '%s' "$products" | jq -er 'if length >= 4 then .[0].id else error("Expected at least four seeded products") end')

printf '%s\n' 'Checking Next.js frontend...'
request_with_retry "$FRONTEND_URL" >/dev/null

cookie_jar=$(mktemp)
cart_headers=$(mktemp)
checkout_headers=$(mktemp)
trap 'rm -f "$cookie_jar" "$cart_headers" "$checkout_headers"' EXIT

printf '%s\n' 'Creating Store API cart session through the Next.js BFF...'
cart=$(request_with_retry -c "$cookie_jar" -b "$cookie_jar" "$FRONTEND_URL/api/cart")
printf '%s' "$cart" | jq -e '.items_count == 0' >/dev/null

cart_request_id='ci-smoke-cart-0001'
printf '%s\n' "Adding product $product_id to the cart..."
cart=$(request_with_retry \
  -D "$cart_headers" \
  -c "$cookie_jar" \
  -b "$cookie_jar" \
  -H 'Content-Type: application/json' \
  -H "X-Request-ID: $cart_request_id" \
  -X POST \
  --data "{\"id\":$product_id,\"quantity\":2}" \
  "$FRONTEND_URL/api/cart/items")
printf '%s' "$cart" | jq -e '.items_count == 2 and (.items | length) == 1' >/dev/null
grep -Eiq "^x-request-id:[[:space:]]*$cart_request_id[[:space:]]*$" "$cart_headers"

checkout_request_id='ci-smoke-checkout-0001'
printf '%s\n' 'Creating WooCommerce order through Store API checkout...'
checkout=$(request_with_retry \
  -D "$checkout_headers" \
  -c "$cookie_jar" \
  -b "$cookie_jar" \
  -H 'Content-Type: application/json' \
  -H "X-Request-ID: $checkout_request_id" \
  -X POST \
  --data '{
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
  }' \
  "$FRONTEND_URL/api/checkout")
grep -Eiq "^x-request-id:[[:space:]]*$checkout_request_id[[:space:]]*$" "$checkout_headers"

order_id=$(printf '%s' "$checkout" | jq -er '.order_id')

case "$order_id" in
  ''|*[!0-9]*)
    printf '%s\n' 'Checkout did not return a numeric order_id.' >&2
    exit 1
    ;;
esac

printf '%s\n' "Verifying WooCommerce order $order_id with HPOS enabled..."
docker compose run --rm -e ORDER_ID="$order_id" wp-cli -c 'wp eval-file /scripts/verify-order.php --allow-root'

printf '%s\n' "Verifying real-world order status audit for order $order_id..."
docker compose run --rm -e ORDER_ID="$order_id" wp-cli -c 'wp eval-file /scripts/verify-order-audit.php --allow-root'

printf '%s\n' 'Checking structured BFF logs and PII exclusion...'
frontend_logs=$(docker compose logs --no-color frontend)
printf '%s' "$frontend_logs" | grep -F "\"request_id\":\"$cart_request_id\"" >/dev/null
printf '%s' "$frontend_logs" | grep -F "\"request_id\":\"$checkout_request_id\"" >/dev/null
printf '%s' "$frontend_logs" | grep -F '"event":"http_request"' >/dev/null

if printf '%s' "$frontend_logs" | grep -F 'ci-smoke@example.com' >/dev/null; then
  printf '%s\n' 'Frontend logs unexpectedly contain checkout email PII.' >&2
  exit 1
fi

printf '%s\n' "Integration smoke test passed. Order ID: $order_id"
