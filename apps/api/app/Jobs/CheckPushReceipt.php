<?php

namespace App\Jobs;

use App\Models\PushDevice;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class CheckPushReceipt implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public string $receiptId) {}

    public function backoff(): array
    {
        return [300, 900, 1800];
    }

    public function handle(): void
    {
        if (! config('push.enabled')) {
            return;
        }
        $row = DB::table('push_receipts')->where('receipt_id', $this->receiptId)->where('state', 'accepted')->first();
        if (! $row) {
            return;
        }
        $request = Http::timeout(10)->acceptJson();
        if (config('push.access_token')) {
            $request = $request->withToken(config('push.access_token'));
        }
        $response = $request->post('https://exp.host/--/api/v2/push/getReceipts', ['ids' => [$this->receiptId]]);
        if (! $response->successful()) {
            throw new \RuntimeException('Push receipt provider returned HTTP '.$response->status());
        }
        $receipt = $response->json('data.'.$this->receiptId);
        if (! $receipt) {
            $this->release(300);

            return;
        }
        $state = ($receipt['status'] ?? null) === 'ok' ? 'confirmed' : 'error';
        $error = $receipt['details']['error'] ?? null;
        DB::table('push_receipts')->where('id', $row->id)->update(['state' => $state, 'error' => is_string($error) ? substr($error, 0, 200) : null, 'updated_at' => now()]);
        if ($error === 'DeviceNotRegistered') {
            PushDevice::where('id', $row->push_device_id)->where('user_id', $row->user_id)->delete();
        }
    }
}
