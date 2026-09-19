<?php
/**
 * Plugin Name: Engineering Demo Order Audit
 * Description: HPOS-compatible audit trail for WooCommerce order status transitions.
 * Version: 0.1.0
 * Requires at least: 7.0
 * Requires PHP: 8.2
 * Requires Plugins: woocommerce
 * Author: Alex Tuluzov
 * Text Domain: engineering-demo-order-audit
 */

declare(strict_types=1);

namespace Tuluzov\EngineeringDemo\OrderAudit;

use Automattic\WooCommerce\Utilities\FeaturesUtil;
use WC_Order;

if (! defined('ABSPATH')) {
    exit;
}

const META_KEY = '_engineering_demo_status_audit';
const MAX_ENTRIES = 50;

add_action('before_woocommerce_init', static function (): void {
    if (class_exists(FeaturesUtil::class)) {
        FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

add_action(
    'woocommerce_order_status_changed',
    __NAMESPACE__ . '\record_status_change',
    10,
    4
);

/**
 * Records a bounded, append-only status transition through WooCommerce CRUD.
 *
 * The audit deliberately avoids direct order-table writes so the same code
 * works with HPOS and the legacy order datastore.
 */
function record_status_change(
    int $order_id,
    string $from_status,
    string $to_status,
    WC_Order $order
): void {
    if ($order_id <= 0 || $from_status === $to_status) {
        return;
    }

    $entries = normalize_entries($order->get_meta(META_KEY, true));
    $entries[] = build_entry($from_status, $to_status);

    if (count($entries) > MAX_ENTRIES) {
        $entries = array_slice($entries, -MAX_ENTRIES);
    }

    $order->update_meta_data(META_KEY, $entries);
    $order->save_meta_data();
}

/**
 * @return array{
 *     timestamp_utc: string,
 *     from: string,
 *     to: string,
 *     actor: array{type: string, user_id: int|null}
 * }
 */
function build_entry(string $from_status, string $to_status): array
{
    $user_id = get_current_user_id();

    return [
        'timestamp_utc' => gmdate('c'),
        'from'          => sanitize_key($from_status),
        'to'            => sanitize_key($to_status),
        'actor'         => [
            'type'    => determine_actor_type($user_id),
            'user_id' => $user_id > 0 ? $user_id : null,
        ],
    ];
}

function determine_actor_type(int $user_id): string
{
    if ($user_id > 0) {
        return 'user';
    }

    if (wp_doing_cron()) {
        return 'cron';
    }

    if (defined('WP_CLI') && WP_CLI) {
        return 'cli';
    }

    if (wp_doing_ajax()) {
        return 'ajax';
    }

    if (defined('REST_REQUEST') && REST_REQUEST) {
        return 'rest';
    }

    return 'system';
}

/**
 * @return array<int, array<string, mixed>>
 */
function normalize_entries(mixed $value): array
{
    if (! is_array($value)) {
        return [];
    }

    return array_values(
        array_filter(
            $value,
            static fn (mixed $entry): bool => is_array($entry)
        )
    );
}
