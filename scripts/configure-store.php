<?php

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('WooCommerce')) {
    WP_CLI::error('WooCommerce is not active.');
}

update_option('woocommerce_currency', 'USD');
update_option('woocommerce_store_address', 'Engineering Demo');
update_option('woocommerce_store_city', 'Demo City');
update_option('woocommerce_default_country', 'US:NY');

$settings = get_option('woocommerce_cheque_settings', []);

if (! is_array($settings)) {
    $settings = [];
}

$settings = array_merge(
    $settings,
    [
        'enabled'      => 'yes',
        'title'        => 'Check payments (engineering demo)',
        'description'  => 'Offline demo gateway. No real payment is collected.',
        'instructions' => 'This order was created by the engineering demo. No payment is required.',
    ]
);

update_option('woocommerce_cheque_settings', $settings);

WP_CLI::success('Demo store settings and offline payment gateway are configured.');
