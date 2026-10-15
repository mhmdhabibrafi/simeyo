<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ConversationAccess
{
    public function query(User $u): Builder
    {
        $actors = User::where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $u->affiliation->institution_id))->whereNotIn('users.id', DB::table('blocks')->select('target_id')->where('user_id', $u->id))->whereNotIn('users.id', DB::table('blocks')->select('user_id')->where('target_id', $u->id));

        return Conversation::where('institution_id', $u->affiliation->institution_id)->whereHas('participants', fn ($p) => $p->where('users.id', $u->id))->whereHas('participants', fn ($p) => $p->where('users.id', '!=', $u->id)->whereIn('users.id', $actors->select('users.id')));
    }

    public function find(User $viewer, int $id): Conversation
    {
        $c = Conversation::where('institution_id', $viewer->affiliation->institution_id)->whereHas('participants', fn ($p) => $p->where('users.id', $viewer->id))->with('participants.profile', 'participants.affiliation')->findOrFail($id);
        foreach ($c->participants as $p) {
            app(PostVisibility::class)->assertProfile($viewer, $p);
        }

        return $c;
    }

    public function canSend(User $sender, User $recipient): bool
    {
        $v = app(PostVisibility::class);
        $v->assertProfile($sender, $recipient);
        $recipient->loadMissing('profile');
        $follows = $v->follows($recipient, $sender);

        return $recipient->profile->dm_policy !== 'nobody' && ($recipient->profile->dm_policy === 'campus' || $follows) && (! $recipient->profile->private_account || $follows);
    }
}
