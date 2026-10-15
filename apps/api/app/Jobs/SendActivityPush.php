<?php

namespace App\Jobs;

use App\Models\PushDevice;
use App\Models\User;
use App\Services\NotificationVisibility;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SendActivityPush implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public int $userId, public string $notificationId)
    {
        $this->afterCommit();
    }

    public function backoff(): array
    {
        return [30, 120, 600];
    }

    public function handle(NotificationVisibility $visibility): void
    {
        if (! config('push.enabled')) {
            return;
        }
        $u = User::with('profile', 'affiliation')->find($this->userId);
        if (! $u) {
            return;
        }
        $notification = $visibility->query($u)->find($this->notificationId);
        if (! $notification) {
            return;
        }
        $kind = $notification->kind;
        if (! in_array($kind, ['moderation', 'verification'], true) && ($u->profile?->notification_preferences[$kind] ?? true) === false) {
            return;
        }
        foreach (PushDevice::where('user_id', $u->id)->with('accessToken')->get() as $device) {
            if (DB::table('push_receipts')->where('notification_id', $notification->id)->where('push_device_id', $device->id)->exists()) {
                continue;
            }
            $token = $device->accessToken;
            if (! $token || ! $token->can('campus') || $token->expires_at?->isPast() || $u->verification_state !== 'approved') {
                continue;
            }
            $request = Http::timeout(10)->acceptJson();
            if (config('push.access_token')) {
                $request = $request->withToken(config('push.access_token'));
            }
            $response = $request->post('https://exp.host/--/api/v2/push/send', ['to' => $device->token, 'title' => 'Simeyo', 'body' => 'Ada aktivitas kampus baru. Buka Simeyo untuk melihatnya.', 'sound' => 'default', 'data' => ['notification_id' => $notification->id, 'user_id' => $u->id]]);
            if (! $response->successful()) {
                throw new \RuntimeException('Push provider returned HTTP '.$response->status());
            }
            $ticket = $response->json('data');
            if (($ticket['status'] ?? null) === 'error') {
                if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                    $device->delete();

                    continue;
                }
                throw new \RuntimeException('Push provider rejected notification.');
            }
            if (($ticket['status'] ?? null) !== 'ok' || ! is_string($ticket['id'] ?? null) || ! preg_match('/^[a-zA-Z0-9-]{1,255}$/', $ticket['id'])) {
                throw new \RuntimeException('Push provider returned an invalid ticket.');
            }
            DB::table('push_receipts')->insertOrIgnore(['user_id' => $u->id, 'push_device_id' => $device->id, 'notification_id' => $notification->id, 'receipt_id' => $ticket['id'], 'state' => 'accepted', 'created_at' => now(), 'updated_at' => now()]);
            CheckPushReceipt::dispatch($ticket['id'])->delay(now()->addMinutes(15));
        }
    }
}
