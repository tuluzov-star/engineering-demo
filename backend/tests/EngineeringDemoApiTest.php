<?php
declare(strict_types=1);

use Automattic\WooCommerce\Utilities\FeaturesUtil;
use Automattic\WooCommerce\Utilities\OrderUtil;
use PHPUnit\Framework\TestCase;
use function Tuluzov\EngineeringDemo\get_health;
use function Tuluzov\EngineeringDemo\get_liveness;
use function Tuluzov\EngineeringDemo\get_readiness;

final class EngineeringDemoApiTest extends TestCase
{
    private EngineeringDemoTestWpdb $wpdb;

    protected function setUp(): void
    {
        parent::setUp();

        $this->wpdb = new EngineeringDemoTestWpdb();
        $GLOBALS['wpdb'] = $this->wpdb;
        $GLOBALS['engineering_demo_test_routes'] = [];

        OrderUtil::$enabled = true;
        FeaturesUtil::$calls = [];
    }

    public function test_registers_public_health_routes(): void
    {
        $callbacks = $GLOBALS['engineering_demo_test_actions']['rest_api_init'] ?? [];

        self::assertNotEmpty($callbacks);

        foreach ($callbacks as $callback) {
            $callback();
        }

        $routes = $GLOBALS['engineering_demo_test_routes'];

        foreach (['/health', '/live', '/ready'] as $route) {
            $key = 'engineering-demo/v1' . $route;

            self::assertArrayHasKey($key, $routes);
            self::assertSame('GET', $routes[$key]['methods']);
            self::assertSame('__return_true', $routes[$key]['permission_callback']);
        }
    }

    public function test_declares_hpos_compatibility(): void
    {
        $callbacks = $GLOBALS['engineering_demo_test_actions']['before_woocommerce_init'] ?? [];

        self::assertNotEmpty($callbacks);

        foreach ($callbacks as $callback) {
            $callback();
        }

        $api_calls = array_values(
            array_filter(
                FeaturesUtil::$calls,
                static fn (array $call): bool => str_contains(
                    $call['file'],
                    'engineering-demo-api.php'
                )
            )
        );

        self::assertCount(1, $api_calls);
        self::assertSame('custom_order_tables', $api_calls[0]['feature']);
        self::assertTrue($api_calls[0]['compatible']);
    }

    public function test_liveness_only_confirms_plugin_process_execution(): void
    {
        $response = get_liveness(new WP_REST_Request());

        self::assertSame(200, $response->get_status());
        self::assertSame('ok', $response->get_data()['status']);
        self::assertSame('wordpress', $response->get_data()['service']);
        self::assertArrayNotHasKey('checks', $response->get_data());
    }

    public function test_readiness_reports_database_woocommerce_and_hpos(): void
    {
        $response = get_readiness(new WP_REST_Request());
        $data = $response->get_data();

        self::assertSame(200, $response->get_status());
        self::assertSame('ready', $data['status']);
        self::assertTrue($data['hpos_enabled']);
        self::assertSame(
            [
                'database'    => true,
                'woocommerce' => true,
                'hpos'        => true,
            ],
            $data['checks']
        );
        self::assertSame('7.1.1-test', $data['wordpress_version']);
        self::assertSame('11.1.0-test', $data['woocommerce_version']);
        self::assertSame('testing', $data['environment']);
    }

    public function test_readiness_fails_when_database_is_unavailable(): void
    {
        $this->wpdb->healthy = false;

        $response = get_readiness(new WP_REST_Request());
        $data = $response->get_data();

        self::assertSame(503, $response->get_status());
        self::assertSame('not_ready', $data['status']);
        self::assertFalse($data['checks']['database']);
        self::assertTrue($data['checks']['woocommerce']);
        self::assertTrue($data['checks']['hpos']);
    }

    public function test_readiness_fails_when_hpos_is_disabled(): void
    {
        OrderUtil::$enabled = false;

        $response = get_readiness(new WP_REST_Request());
        $data = $response->get_data();

        self::assertSame(503, $response->get_status());
        self::assertSame('not_ready', $data['status']);
        self::assertFalse($data['hpos_enabled']);
        self::assertFalse($data['checks']['hpos']);
    }

    public function test_backward_compatible_health_tracks_readiness(): void
    {
        $healthy = get_health(new WP_REST_Request());

        self::assertSame(200, $healthy->get_status());
        self::assertSame('ok', $healthy->get_data()['status']);

        OrderUtil::$enabled = false;

        $degraded = get_health(new WP_REST_Request());

        self::assertSame(503, $degraded->get_status());
        self::assertSame('degraded', $degraded->get_data()['status']);
    }
}
