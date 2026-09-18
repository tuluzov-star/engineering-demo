<?php
/**
 * Plugin Name: Engineering Demo API
 * Description: Small, read-only REST layer used by the Tuluzov engineering demo.
 * Version: 0.1.0
 * Requires at least: 7.0
 * Requires PHP: 8.2
 * Requires Plugins: woocommerce
 * Author: Alex Tuluzov
 * Text Domain: engineering-demo-api
 */

declare(strict_types=1);

namespace Tuluzov\EngineeringDemo;

use Automattic\WooCommerce\Utilities\FeaturesUtil;
use Automattic\WooCommerce\Utilities\OrderUtil;
use WP_REST_Request;
use WP_REST_Response;

if (! defined('ABSPATH')) {
    exit;
}

add_action('before_woocommerce_init', static function (): void {
    if (class_exists(FeaturesUtil::class)) {
        FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

add_action('rest_api_init', static function (): void {
    register_rest_route(
        'engineering-demo/v1',
        '/health',
        [
            'methods'             => 'GET',
            'callback'            => __NAMESPACE__ . '\\get_health',
            'permission_callback' => '__return_true',
        ]
    );
});

/**
 * Public health endpoint. It intentionally exposes only non-sensitive runtime metadata.
 */
function get_health(WP_REST_Request $request): WP_REST_Response
{
    unset($request);

    $hpos_enabled = null;

    if (class_exists(OrderUtil::class)) {
        $hpos_enabled = OrderUtil::custom_orders_table_usage_is_enabled();
    }

    return new WP_REST_Response(
        [
            'project'             => 'tuluzov-engineering-demo',
            'status'              => 'ok',
            'wordpress_version'   => get_bloginfo('version'),
            'woocommerce_version' => defined('WC_VERSION') ? WC_VERSION : null,
            'php_version'         => PHP_VERSION,
            'environment'         => wp_get_environment_type(),
            'hpos_enabled'        => $hpos_enabled,
            'timestamp_utc'       => gmdate('c'),
        ],
        200
    );
}
