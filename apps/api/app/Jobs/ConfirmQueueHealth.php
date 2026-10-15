<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

class ConfirmQueueHealth implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public string $probeId) {}

    public function handle(): void
    {
        Cache::put('simeyo:queue-probe:'.$this->probeId, true, 60);
    }
}
