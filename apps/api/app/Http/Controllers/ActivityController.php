<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\CampusActivity;
use App\Services\NotificationVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActivityController extends Controller
{
    public function index(Request $r)
    {
        $u = $r->user();
        $q = app(NotificationVisibility::class)->query($u, ! $u->currentAccessToken() || $u->tokenCan('campus'));
        $unread = (clone $q)->whereNull('read_at')->count();
        $page = $q->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate(30);
        $actors = User::whereIn('id', $page->pluck('actor_id'))->get(['id', 'name', 'username'])->keyBy('id');

        return ['data' => $page->map(function ($n) use ($actors) {
            $d = $n->data;

            return ['id' => $n->id, 'kind' => $n->kind, 'actor' => $actors[$n->actor_id]?->only('id', 'name', 'username'), 'post_id' => $n->post_id, 'conversation_id' => $n->conversation_id, 'message' => $d['message'] ?? null, 'read_at' => $n->read_at, 'created_at' => $n->created_at];
        })->values(), 'next_cursor' => $page->nextCursor()?->encode(), 'unread_count' => $unread];
    }

    public function read(Request $r, string $notification)
    {
        $r->user()->notifications()->findOrFail($notification)->markAsRead();

        return response()->noContent();
    }

    public function preferences(Request $r)
    {
        $rules = ['dm_policy' => 'sometimes|required|in:campus,followers,nobody', 'notification_preferences' => 'sometimes|array:'.implode(',', CampusActivity::PREFERENCES)];
        foreach (CampusActivity::PREFERENCES as $p) {
            $rules['notification_preferences.'.$p] = 'sometimes|boolean';
        }
        if ($r->isMethod('patch')) {
            $data = $r->validate($rules);
            DB::transaction(function () use ($r, $data) {
                DB::table('users')->where('id', $r->user()->id)->lockForUpdate()->first();
                $r->user()->profile->update($data);
            });
        }

        return ['data' => $r->user()->profile->only('dm_policy', 'notification_preferences')];
    }

    public function realtime()
    {
        return ['data' => ['origin' => config('ruang.frontend_url'), 'enabled' => config('broadcasting.default') === 'reverb', 'key' => config('broadcasting.connections.reverb.key'), 'host' => config('ruang.reverb_client_host') ?? config('broadcasting.connections.reverb.options.host'), 'port' => (int) (config('ruang.reverb_client_port') ?? config('broadcasting.connections.reverb.options.port')), 'scheme' => config('ruang.reverb_client_scheme') ?? config('broadcasting.connections.reverb.options.scheme')]];
    }
}
