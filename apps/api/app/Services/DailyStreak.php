<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class DailyStreak
{
    public function record(int $userId): void
    {
        // Post creation already holds the author's row lock in this transaction.
        $date = now('Asia/Jakarta');
        $today = $date->toDateString();
        $row = DB::table('user_streaks')->where('user_id', $userId)->first();
        if ($row && $row->last_active_date >= $today) {
            return;
        }
        $days = $row && $row->last_active_date === $date->copy()->subDay()->toDateString()
            ? $row->current_days + 1 : 1;
        DB::table('user_streaks')->updateOrInsert(['user_id' => $userId], [
            'last_active_date' => $today,
            'current_days' => $days,
            'longest_days' => max($row->longest_days ?? 0, $days),
        ]);
    }

    public function summary(int $userId): array
    {
        $row = DB::table('user_streaks')->where('user_id', $userId)->first();
        $today = now('Asia/Jakarta');

        return [
            'current_days' => $row && $row->last_active_date >= $today->copy()->subDay()->toDateString() ? $row->current_days : 0,
            'longest_days' => $row->longest_days ?? 0,
            'completed_today' => $row && $row->last_active_date === $today->toDateString(),
            'timezone' => 'Asia/Jakarta',
            'next_reset_at' => $today->copy()->addDay()->startOfDay()->toIso8601String(),
        ];
    }
}
