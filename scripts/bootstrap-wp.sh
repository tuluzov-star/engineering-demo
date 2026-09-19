#!/usr/bin/env sh
set -eu

cd /var/www/html

printf '%s\n' 'Waiting for WordPress files...'
tries=0
until [ -f wp-load.php ] && wp core version --allow-root >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 60 ]; then
    printf '%s\n' 'WordPress files did not become available.' >&2
    exit 1
  fi
  sleep 2
done

if ! wp core is-installed --allow-root >/dev/null 2>&1; then
  wp core install \
    --allow-root \
    --url="${WP_URL}" \
    --title="${WP_TITLE}" \
    --admin_user="${WP_ADMIN_USER}" \
    --admin_password="${WP_ADMIN_PASSWORD}" \
    --admin_email="${WP_ADMIN_EMAIL}" \
    --skip-email
fi

wp option update home "${WP_URL}" --allow-root
wp option update siteurl "${WP_URL}" --allow-root
wp option update blogdescription 'WordPress + WooCommerce backend for a Next.js engineering demo' --allow-root
wp rewrite structure '/%postname%/' --hard --allow-root

if ! wp plugin is-installed woocommerce --allow-root; then
  wp plugin install woocommerce --version=11.1.0 --activate --allow-root
else
  wp plugin activate woocommerce --allow-root
fi

wp plugin activate engineering-demo-api --allow-root
wp plugin activate engineering-demo-order-audit --allow-root

hpos_enabled=$(wp option get woocommerce_custom_orders_table_enabled --allow-root 2>/dev/null || true)
if [ "$hpos_enabled" != "yes" ]; then
  wp wc hpos enable --allow-root
fi

wp eval-file /scripts/configure-store.php --allow-root
wp eval-file /scripts/seed-products.php --allow-root

printf '\n%s\n' 'Backend ready.'
printf '%s\n' "WordPress: ${WP_URL}"
printf '%s\n' "Health: ${WP_URL}/wp-json/engineering-demo/v1/health"
printf '%s\n' "Products: ${WP_URL}/wp-json/wc/store/v1/products"
