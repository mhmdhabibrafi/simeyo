<?php

namespace Tests\Feature;

use App\Jobs\ConfirmQueueHealth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_read_only_check_reports_ready_jobs_but_ignores_future_delivery_age(): void
    {
        config(['queue.default' => 'database']);
        DB::table('jobs')->insert(['queue' => 'default', 'payload' => 'private-payload-never-output', 'attempts' => 0, 'available_at' => now()->addHour()->timestamp, 'created_at' => now()->subHour()->timestamp]);
        $this->assertSame(0, Artisan::call('simeyo:operations-check'));
        $state = json_decode(Artisan::output(), true);
        $this->assertSame(0, $state['ready_jobs']);
        $this->assertSame('not_requested', $state['worker_probe']);
        $this->assertStringNotContainsString('private-payload', Artisan::output());
        $this->assertDatabaseCount('jobs', 1);
    }

    public function test_overdue_ready_jobs_fail_without_exposing_the_payload(): void
    {
        config(['queue.default' => 'database']);
        DB::table('jobs')->insert(['queue' => 'default', 'payload' => 'private-payload-never-output', 'attempts' => 0, 'available_at' => now()->subHour()->timestamp, 'created_at' => now()->subHour()->timestamp]);
        $this->assertSame(1, Artisan::call('simeyo:operations-check'));
        $this->assertFalse(json_decode(Artisan::output(), true)['healthy']);
        $this->assertStringNotContainsString('private-payload', Artisan::output());
    }

    public function test_worker_heartbeat_requires_shared_cache_and_valid_bounds(): void
    {
        config(['queue.default' => 'database', 'cache.default' => 'array']);
        $this->assertSame(1, Artisan::call('simeyo:operations-check', ['--probe-queue' => true]));
        $this->assertDatabaseCount('jobs', 0);
        $this->assertSame(1, Artisan::call('simeyo:operations-check', ['--wait' => 0]));
    }

    public function test_probe_only_writes_its_short_lived_cache_key(): void
    {
        ConfirmQueueHealth::dispatchSync('synthetic-probe');
        $this->assertTrue(Cache::get('simeyo:queue-probe:synthetic-probe'));
        $this->travel(61)->seconds();
        $this->assertNull(Cache::get('simeyo:queue-probe:synthetic-probe'));
    }
}
