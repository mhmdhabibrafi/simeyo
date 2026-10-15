<?php

namespace App\Http\Controllers;

use App\Models\PushDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class PushDeviceController extends Controller
{
    private function token(Request $r): PersonalAccessToken
    {
        $token = $r->user()->currentAccessToken();
        abort_unless($token instanceof PersonalAccessToken && $token->can('campus'), 403);

        return $token;
    }

    public function index(Request $r)
    {
        $this->token($r);

        return ['data' => PushDevice::where('user_id', $r->user()->id)->orderBy('id')->get(['id', 'name', 'platform', 'updated_at'])];
    }

    public function store(Request $r)
    {
        $access = $this->token($r);
        $d = $r->validate(['token' => ['required', 'string', 'max:255', 'regex:/^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_\-]+\]$/'], 'platform' => 'required|in:android,ios', 'name' => 'required|string|max:80']);
        $device = DB::transaction(function () use ($r, $access, $d) {
            DB::table('users')->where('id', $r->user()->id)->lockForUpdate()->first();
            $hash = hash('sha256', $d['token']);
            PushDevice::where('personal_access_token_id', $access->id)->where('token_hash', '!=', $hash)->delete();
            abort_if(PushDevice::where('user_id', $r->user()->id)->where('token_hash', '!=', $hash)->count() >= 10, 422, 'Batas perangkat tercapai. Cabut perangkat lama terlebih dahulu.');

            return PushDevice::updateOrCreate(['token_hash' => $hash], ['user_id' => $r->user()->id, 'personal_access_token_id' => $access->id, 'token' => $d['token'], 'name' => $d['name'], 'platform' => $d['platform']]);
        }, 3);

        return response()->json(['data' => $device->only('id', 'name', 'platform', 'updated_at')], 201);
    }

    public function destroy(Request $r, int $device)
    {
        $this->token($r);
        PushDevice::where('user_id', $r->user()->id)->findOrFail($device)->delete();

        return response()->noContent();
    }
}
