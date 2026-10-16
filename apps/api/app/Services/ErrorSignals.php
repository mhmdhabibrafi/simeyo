<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ErrorSignals
{
    public function record(int $status): void
    {
        if ($status < 500) {
            return;
        }
        $key = 'operations:5xx:'.intdiv(now()->timestamp, 60);
        Cache::add($key, 0, 360);
        Cache::increment($key);
    }

    public function recent(): int
    {
        $minute = intdiv(now()->timestamp, 60);
        $count = 0;
        for ($i = 0; $i < 5; $i++) {
            $count += (int) Cache::get('operations:5xx:'.($minute - $i), 0);
        }

        return $count;
    }
}
