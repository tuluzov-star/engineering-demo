# Real-world integration: WooCommerce order-status audit trail

## Origin

This case is extracted and generalized from a production WooCommerce support problem: an order could unexpectedly move to a different status after payment, while the existing system did not preserve enough evidence to answer **who or what changed it, and when**.

The demo intentionally does not copy client code, credentials, order data, plugin names or infrastructure. It preserves only the engineering problem.

## Goal

Record every WooCommerce order-status transition in a way that:

- works with HPOS;
- does not modify WordPress or WooCommerce core;
- does not write directly to WooCommerce order tables;
- remains useful for transitions triggered by users, WP-CLI, cron, AJAX, REST requests or background/system code;
- stores no customer PII;
- keeps storage bounded.

## Implementation

The isolated mini-plugin is:

`backend/wp-content/plugins/engineering-demo-order-audit/engineering-demo-order-audit.php`

It listens to WooCommerce's public `woocommerce_order_status_changed` action and stores a bounded append-only audit array as order meta through `WC_Order` CRUD.

Each entry contains only:

- UTC timestamp;
- previous status;
- new status;
- coarse actor type;
- WordPress user ID when an authenticated user initiated the request.

The audit intentionally does **not** claim that a hook can always identify the exact third-party callback or source plugin. For unauthenticated/background transitions, the actor classification is evidence about the execution context, not proof of causal ownership.

## HPOS compatibility

The plugin declares `custom_order_tables` compatibility and uses WooCommerce order CRUD/meta APIs. It does not assume that orders are WordPress posts and does not write to `wp_posts`, `wp_postmeta` or HPOS tables directly.

## Verification

CI activates the plugin in the real Docker WooCommerce stack. After Store API checkout creates an order, a WP-CLI verification script:

1. loads the order with `wc_get_order()`;
2. performs a real status transition with WooCommerce CRUD;
3. reloads the order;
4. asserts that the audit entry persisted;
5. checks the previous/new statuses, timestamp and actor context while HPOS is enabled.

This complements isolated PHP contract tests with a live WooCommerce/HPOS integration check.

## Production extension

For a real support deployment I would normally add an authenticated admin viewer, retention/export controls and correlation IDs where the surrounding payment/integration code exposes them. Those features are intentionally omitted here so the portfolio example stays small and does not invent evidence WooCommerce cannot provide.
