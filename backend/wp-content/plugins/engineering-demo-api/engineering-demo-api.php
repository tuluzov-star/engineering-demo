<?php
/**
 * Plugin Name: Engineering Demo API
 * Description: Small, read-only REST layer used by the Tuluzov engineering demo.
 * Version: 0.2.0
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
    foreach (
        [
            '/health' => __NAMESPACE__ . '\\get_health',
            '/live'   => __NAMESPACE__ . '\\get_liveness',
            '/ready'  => __NAMESPACE__ . '\\get_readiness',
        ] as $route => $callback
    ) {
        register_rest_route(
            'engineering-demo/v1',
            $route,
            [
                'methods'             => 'GET',
                'callback'            => $callback,
                'permission_callback' => '__return_true',
            ]
        );
    }
});

/**
 * Backward-compatible aggregate health endpoint.
 *
 * It intentionally exposes only non-sensitive runtime metadata.
 */
function get_health(WP_REST_Request $request): WP_REST_Response
{
    unset($request);

    $state = get_readiness_state();

    return new WP_REST_Response(
        build_runtime_payload(
            $state['ready'] ? 'ok' : 'degraded',
            $state
        ),
        $state['ready'] ? 200 : 503
    );
}

/**
 * Liveness means the WordPress/PHP process can execute the plugin.
 *
 * Dependency checks intentionally do not belong here.
 */
function get_liveness(WP_REST_Request $request): WP_REST_Response
{
    unset($request);

    return new WP_REST_Response(
        [
            'project'       => 'tuluzov-engineering-demo',
            'status'        => 'ok',
            'service'       => 'wordpress',
            'timestamp_utc' => gmdate('c'),
        ],
        200
    );
}

/**
 * Readiness means the commerce backend can serve the demo safely.
 */
function get_readiness(WP_REST_Request $request): WP_REST_Response
{
    unset($request);

    $state = get_readiness_state();

    return new WP_REST_Response(
        build_runtime_payload(
            $state['ready'] ? 'ready' : 'not_ready',
            $state
        ),
        $state['ready'] ? 200 : 503
    );
}

/**
 * @return array{
 *     ready: bool,
 *     database: bool,
 *     woocommerce: bool,
 *     hpos: bool,
 *     hpos_enabled: bool|null
 * }
 */
function get_readiness_state(): array
{
    global $wpdb;

    $database_ready = false;

    if (isset($wpdb)) {
        $probe = $wpdb->get_var('SELECT 1');
        $database_ready = '1' === (string) $probe && '' === (string) $wpdb->last_error;
    }

    $woocommerce_ready = defined('WC_VERSION') && function_exists('WC');
    $hpos_enabled = null;

    if (class_exists(OrderUtil::class)) {
        $hpos_enabled = OrderUtil::custom_orders_table_usage_is_enabled();
    }

    $hpos_ready = true === $hpos_enabled;

    return [
        'ready'         => $database_ready && $woocommerce_ready && $hpos_ready,
        'database'      => $database_ready,
        'woocommerce'   => $woocommerce_ready,
        'hpos'          => $hpos_ready,
        'hpos_enabled'  => $hpos_enabled,
    ];
}

/**
 * @param array{
 *     ready: bool,
 *     database: bool,
 *     woocommerce: bool,
 *     hpos: bool,
 *     hpos_enabled: bool|null
 * } $state
 *
 * @return array<string, mixed>
 */
function build_runtime_payload(string $status, array $state): array
{
    return [
        'project'             => 'tuluzov-engineering-demo',
        'status'              => $status,
        'wordpress_version'   => get_bloginfo('version'),
        'woocommerce_version' => defined('WC_VERSION') ? WC_VERSION : null,
        'php_version'         => PHP_VERSION,
        'environment'         => wp_get_environment_type(),
        'hpos_enabled'        => $state['hpos_enabled'],
        'checks'              => [
            'database'    => $state['database'],
            'woocommerce' => $state['woocommerce'],
            'hpos'        => $state['hpos'],
        ],
        'timestamp_utc'       => gmdate('c'),
    ];
}
