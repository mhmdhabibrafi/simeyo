<?php

namespace App\Services;

use App\Events\ActivityChanged;
use App\Jobs\SendActivityPush;
use App\Models\User;
use App\Notifications\CampusActivity as ActivityNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CampusActivity
{
    public const PREFERENCES = ['likes', 'replies', 'mentions', 'reposts', 'follows', 'messages', 'community', 'events'];

    public function send(User $recipient, User $actor, string $kind, array $reference = []): void
    {
        $mandatory = in_array($kind, ['verification', 'moderation'], true);
        if (! $mandatory && ($actor->id === $recipient->id || app(PostVisibility::class)->blocked($recipient, $actor))) {
            return;
        }
        if ($recipient->affiliation?->institution_id !== $actor->affiliation?->institution_id) {
            return;
        }
        $recipient->loadMissing('profile');
        if (! $mandatory && ($recipient->profile?->notification_preferences[$kind] ?? true) === false) {
            return;
        }
        if (isset($reference['post_id']) && ! app(PostVisibility::class)->query($recipient)->whereKey($reference['post_id'])->exists()) {
            return;
        }
        DB::transaction(function () use ($recipient, $actor, $kind, $reference) {
            $notification = new ActivityNotification(['kind' => $kind, 'actor_id' => $actor->id] + $reference);
            $notification->id = (string) Str::uuid();
            $recipient->notify($notification);
            DB::table('notifications')->where('id', $notification->id)->update(['actor_id' => $actor->id, 'kind' => $kind, 'post_id' => $reference['post_id'] ?? null, 'conversation_id' => $reference['conversation_id'] ?? null]);
            ActivityChanged::dispatch($recipient->id);
            if (config('push.enabled')) {
                SendActivityPush::dispatch($recipient->id, $notification->id);
            }
        });
    }
}
