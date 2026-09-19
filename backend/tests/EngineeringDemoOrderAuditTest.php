<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use function Tuluzov\EngineeringDemo\OrderAudit\build_entry;
use function Tuluzov\EngineeringDemo\OrderAudit\normalize_entries;
use function Tuluzov\EngineeringDemo\OrderAudit\record_status_change;

final class EngineeringDemoOrderAuditTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $GLOBALS['engineering_demo_test_user_id'] = 0;
        $GLOBALS['engineering_demo_test_doing_cron'] = false;
        $GLOBALS['engineering_demo_test_doing_ajax'] = false;
    }

    public function test_records_status_transition_as_order_meta(): void
    {
        $order = new WC_Order();

        record_status_change(42, 'pending', 'processing', $order);

        $entries = $order->get_meta('_engineering_demo_status_audit', true);

        self::assertCount(1, $entries);
        self::assertSame('pending', $entries[0]['from']);
        self::assertSame('processing', $entries[0]['to']);
        self::assertSame('system', $entries[0]['actor']['type']);
        self::assertNull($entries[0]['actor']['user_id']);
        self::assertSame(1, $order->save_meta_calls);
    }

    public function test_authenticated_transition_records_user_context(): void
    {
        $GLOBALS['engineering_demo_test_user_id'] = 17;

        $entry = build_entry('on-hold', 'processing');

        self::assertSame('user', $entry['actor']['type']);
        self::assertSame(17, $entry['actor']['user_id']);
        self::assertSame('on-hold', $entry['from']);
        self::assertSame('processing', $entry['to']);
        self::assertNotSame('', $entry['timestamp_utc']);
    }

    public function test_cron_context_is_classified_without_inventing_identity(): void
    {
        $GLOBALS['engineering_demo_test_doing_cron'] = true;

        $entry = build_entry('processing', 'completed');

        self::assertSame('cron', $entry['actor']['type']);
        self::assertNull($entry['actor']['user_id']);
    }

    public function test_same_status_and_invalid_order_are_ignored(): void
    {
        $order = new WC_Order();

        record_status_change(0, 'pending', 'processing', $order);
        record_status_change(42, 'processing', 'processing', $order);

        self::assertSame('', $order->get_meta('_engineering_demo_status_audit', true));
        self::assertSame(0, $order->save_meta_calls);
    }

    public function test_history_is_bounded_to_fifty_entries(): void
    {
        $order = new WC_Order();

        for ($index = 0; $index < 55; ++$index) {
            record_status_change(42, 'status-' . $index, 'status-' . ($index + 1), $order);
        }

        $entries = $order->get_meta('_engineering_demo_status_audit', true);

        self::assertCount(50, $entries);
        self::assertSame('status-5', $entries[0]['from']);
        self::assertSame('status-55', $entries[49]['to']);
    }

    public function test_normalize_entries_rejects_non_array_values(): void
    {
        self::assertSame([], normalize_entries('not-an-array'));
        self::assertSame([['from' => 'pending']], normalize_entries([null, ['from' => 'pending'], 'bad']));
    }
}
