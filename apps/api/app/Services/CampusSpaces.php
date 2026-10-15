<?php

namespace App\Services;

use App\Models\CampusEvent;
use App\Models\Community;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class CampusSpaces
{
    public function communities(User $u): Builder
    {
        return Community::where('institution_id', $u->affiliation->institution_id)->whereIn('owner_id', User::where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $u->affiliation->institution_id))->select('id'))->whereNotIn('owner_id', DB::table('blocks')->select('target_id')->where('user_id', $u->id))->whereNotIn('owner_id', DB::table('blocks')->select('user_id')->where('target_id', $u->id));
    }

    public function visibleCommunities(User $u): Builder
    {
        return $this->communities($u)->where(fn ($q) => $q->where('visibility', 'campus')->orWhereHas('members', fn ($m) => $m->where('users.id', $u->id)->where('community_members.state', 'active')));
    }

    public function membership(User $u, Community $c): ?object
    {
        return DB::table('community_members')->where('community_id', $c->id)->where('user_id', $u->id)->first();
    }

    public function assertMember(User $u, Community $c): void
    {
        abort_unless($this->membership($u, $c)?->state === 'active', 403, 'Bergabung dengan komunitas terlebih dahulu.');
    }

    public function assertManager(User $u, Community $c): void
    {
        $m = $this->membership($u, $c);
        abort_unless($m?->state === 'active' && in_array($m->role, ['owner', 'moderator'], true), 403);
    }

    public function events(User $u): Builder
    {
        return CampusEvent::where('institution_id', $u->affiliation->institution_id)->whereIn('user_id', User::where('verification_state', 'approved')->whereNotNull('email_verified_at')->select('id'))->whereNotIn('user_id', DB::table('blocks')->select('target_id')->where('user_id', $u->id))->whereNotIn('user_id', DB::table('blocks')->select('user_id')->where('target_id', $u->id))->where(fn ($q) => $q->whereNull('community_id')->orWhereIn('community_id', $this->visibleCommunities($u)->select('communities.id')));
    }
}
