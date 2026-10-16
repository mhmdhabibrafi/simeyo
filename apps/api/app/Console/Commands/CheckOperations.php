<?php

namespace App\Console\Commands;

use App\Jobs\ConfirmQueueHealth;
use App\Services\ErrorSignals;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckOperations extends Command
{
    protected $signature = 'simeyo:operations-check {--probe-queue : Enqueue a synthetic worker heartbeat} {--wait=10 : Heartbeat deadline, 1-30 seconds} {--max-age=300 : Maximum ready-job age, 60-3600 seconds}';

    protected $description = 'Report database/queue health as redacted JSON without exposing job payloads';

    public function handle(): int
    {
        $wait = filter_var($this->option('wait'), FILTER_VALIDATE_INT);
        $maxAge = filter_var($this->option('max-age'), FILTER_VALIDATE_INT);
        if ($wait === false || $wait < 1 || $wait > 30 || $maxAge === false || $maxAge < 60 || $maxAge > 3600) {
            $this->error('Use --wait=1..30 and --max-age=60..3600.');

            return self::FAILURE;
        }
        $state = ['database' => false, 'queue_driver' => config('queue.default'), 'ready_jobs' => null, 'oldest_ready_age_seconds' => null, 'failed_jobs' => null, 'worker_probe' => 'not_requested'];
        $probe = null;
        try {
            DB::select('select 1');
            $state['database'] = true;
            if (config('queue.default') !== 'database') {
                throw new \RuntimeException('This check requires the release database queue.');
            }
            $connection = DB::connection(config('queue.connections.database.connection'));
            $ready = $connection->table(config('queue.connections.database.table'))->where('queue', config('queue.connections.database.queue'))->where('available_at', '<=', now()->timestamp);
            $state['ready_jobs'] = (clone $ready)->count();
            $oldest = $ready->min('created_at');
            $state['oldest_ready_age_seconds'] = $oldest === null ? 0 : max(0, now()->timestamp - $oldest);
            $state['failed_jobs'] = DB::connection(config('queue.failed.database'))->table(config('queue.failed.table'))->count();
            if ($this->option('probe-queue')) {
                if (in_array(config('cache.default'), ['array', 'null'], true)) {
                    throw new \RuntimeException('A shared cache is required for the worker probe.');
                }
                $probe = 'simeyo:queue-probe:'.($id = (string) Str::uuid());
                ConfirmQueueHealth::dispatch($id);
                $deadline = microtime(true) + $wait;
                do {
                    if (Cache::get($probe) === true) {
                        $state['worker_probe'] = 'passed';
                        break;
                    }
                    usleep(100000);
                } while (microtime(true) < $deadline);
                if ($state['worker_probe'] !== 'passed') {
                    $state['worker_probe'] = 'timed_out';
                }
            }
            $state['recent_5xx'] = app(ErrorSignals::class)->recent();
            $state['healthy'] = $state['recent_5xx'] < 5 && $state['oldest_ready_age_seconds'] <= $maxAge && $state['failed_jobs'] === 0 && in_array($state['worker_probe'], ['not_requested', 'passed'], true);
        } catch (\Throwable) {
            $state['healthy'] = false;
            $state['error'] = 'Database/queue/cache check failed; inspect restricted server logs.';
        } finally {
            if ($probe !== null) {
                try {
                    Cache::forget($probe);
                } catch (\Throwable) {
                    $state['healthy'] = false;
                }
            }
        }
        $this->line(json_encode($state, JSON_THROW_ON_ERROR));

        return $state['healthy'] ? self::SUCCESS : self::FAILURE;
    }
}
