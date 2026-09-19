<?php

if (! defined('ABSPATH')) {
    exit;
}

$order_id = (int) getenv('ORDER_ID');

if ($order_id <= 0) {
    WP_CLI::error('ORDER_ID must be a positive integer.');
}

$order = wc_get_order($order_id);

if (! $order instanceof WC_Order) {
    WP_CLI::error(sprintf('WooCommerce order %d was not found.', $order_id));
}

$initial_status = $order->get_status();
$target_status = 'completed' === $initial_status ? 'processing' : 'completed';

$order->update_status($target_status, 'Engineering Demo audit verification.', true);

$reloaded = wc_get_order($order_id);

if (! $reloaded instanceof WC_Order) {
    WP_CLI::error('Order could not be reloaded after the status transition.');
}

$entries = $reloaded->get_meta('_engineering_demo_status_audit', true);

if (! is_array($entries) || [] === $entries) {
    WP_CLI::error('Order status audit entry was not persisted.');
}

$last = end($entries);

if (
    ! is_array($last)
    || ($last['from'] ?? null) !== $initial_status
    || ($last['to'] ?? null) !== $target_status
    || empty($last['timestamp_utc'])
    || ! isset($last['actor']['type'])
) {
    WP_CLI::error('Persisted order status audit entry does not match the verified transition.');
}

WP_CLI::success(
    sprintf(
        'Order %d audit verified through WooCommerce CRUD with HPOS enabled: %s -> %s (%s).',
        $order_id,
        $initial_status,
        $target_status,
        (string) $last['actor']['type']
    )
);
