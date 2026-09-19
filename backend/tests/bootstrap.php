<?php
declare(strict_types=1);

namespace Automattic\WooCommerce\Utilities {
    final class FeaturesUtil
    {
        /** @var array<int, array{feature: string, file: string, compatible: bool}> */
        public static array $calls = [];

        public static function declare_compatibility(string $feature, string $file, bool $compatible): void
        {
            self::$calls[] = [
                'feature'    => $feature,
                'file'       => $file,
                'compatible' => $compatible,
            ];
        }
    }

    final class OrderUtil
    {
        public static bool $enabled = true;

        public static function custom_orders_table_usage_is_enabled(): bool
        {
            return self::$enabled;
        }
    }
}

namespace {
    if (! defined('ABSPATH')) {
        define('ABSPATH', __DIR__ . '/');
    }

    if (! defined('WC_VERSION')) {
        define('WC_VERSION', '11.1.0-test');
    }

    $GLOBALS['engineering_demo_test_actions'] = [];
    $GLOBALS['engineering_demo_test_routes'] = [];

    function add_action(string $hook, callable $callback): void
    {
        $GLOBALS['engineering_demo_test_actions'][$hook][] = $callback;
    }

    /**
     * @param array<string, mixed> $args
     */
    function register_rest_route(string $namespace, string $route, array $args): bool
    {
        $GLOBALS['engineering_demo_test_routes'][$namespace . $route] = $args;
        return true;
    }

    function get_bloginfo(string $show = ''): string
    {
        unset($show);
        return '7.1.1-test';
    }

    function wp_get_environment_type(): string
    {
        return 'testing';
    }

    function WC(): object
    {
        return (object) ['ready' => true];
    }

    function __return_true(): bool
    {
        return true;
    }

    class WP_REST_Request
    {
    }

    class WP_REST_Response
    {
        public function __construct(
            private mixed $data = null,
            private int $status = 200
        ) {
        }

        public function get_data(): mixed
        {
            return $this->data;
        }

        public function get_status(): int
        {
            return $this->status;
        }
    }

    final class EngineeringDemoTestWpdb
    {
        public string $last_error = '';
        public bool $healthy = true;

        public function get_var(string $query): ?string
        {
            unset($query);

            if (! $this->healthy) {
                $this->last_error = 'database unavailable';
                return null;
            }

            $this->last_error = '';
            return '1';
        }
    }

    require_once dirname(__DIR__) . '/wp-content/plugins/engineering-demo-api/engineering-demo-api.php';
}
