<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class NotificationVisibility
{
    public function query(User $u, bool $campusScope = true)
    {
        return $u->notifications()->where(function ($q) use ($u, $campusScope) {
            $q->whereIn('kind', ['verification', 'moderation']);
            if (! $campusScope || $u->verification_state !== 'approved' || ! $u->hasVerifiedEmail() || ! $u->affiliation) {
                return;
            }
            $actors = User::where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $u->affiliation->institution_id))->whereNotIn('id', DB::table('blocks')->select('target_id')->where('user_id', $u->id))->whereNotIn('id', DB::table('blocks')->select('user_id')->where('target_id', $u->id));
            $q->orWhere(fn ($q) => $q->whereIn('actor_id', $actors->select('id'))->where(fn ($p) => $p->whereNull('post_id')->orWhereIn('post_id', app(PostVisibility::class)->query($u)->select('posts.id')))->where(fn ($c) => $c->whereNull('conversation_id')->orWhereIn('conversation_id', app(ConversationAccess::class)->query($u)->select('conversations.id'))));
        });
    }
}
