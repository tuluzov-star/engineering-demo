<?php

if (! defined('ABSPATH')) {
    exit;
}

$order_id = (int) getenv('ORDER_ID');

if ($order_id <= 0) {
    WP_CLI::error('ORDER_ID must be a positive integer.');
}

if (! class_exists('WC_Order')) {
    WP_CLI::error('WooCommerce is not active.');
}

if (
    ! class_exists(Automattic\WooCommerce\Utilities\OrderUtil::class)
    || ! Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()
) {
    WP_CLI::error('HPOS is not enabled.');
}

$order = wc_get_order($order_id);

if (! $order instanceof WC_Order) {
    WP_CLI::error(sprintf('WooCommerce order %d was not found.', $order_id));
}

WP_CLI::success(
    sprintf(
        'Order %d is available through WooCommerce CRUD with HPOS enabled. Status: %s.',
        $order_id,
        $order->get_status()
    )
);
