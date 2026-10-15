<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PostVisibility
{
    public function blocked(User $viewer, User $target): bool
    {
        return DB::table('blocks')->where(fn ($q) => $q->where('user_id', $viewer->id)->where('target_id', $target->id))->orWhere(fn ($q) => $q->where('user_id', $target->id)->where('target_id', $viewer->id))->exists();
    }

    public function assertProfile(User $viewer, User $target): void
    {
        abort_unless($target->verification_state === 'approved' && $target->hasVerifiedEmail() && $target->affiliation?->institution_id === $viewer->affiliation?->institution_id && ! $this->blocked($viewer, $target), 404);
    }

    public function follows(User $viewer, User $target): bool
    {
        return DB::table('follows')->where('follower_id', $viewer->id)->where('followed_id', $target->id)->where('state', 'accepted')->exists();
    }

    public function base(User $viewer, ?Builder $query = null): Builder
    {
        $q = $query ?? Post::query();
        $t = $q->getModel()->getTable();
        $follow = fn ($f) => $f->selectRaw('1')->from('follows')->whereColumn('follows.followed_id', $t.'.user_id')->where('follows.follower_id', $viewer->id)->where('follows.state', 'accepted');

        return $q->where($t.'.institution_id', $viewer->affiliation->institution_id)
            ->where(fn ($c) => $c->whereNull($t.'.community_id')->orWhereIn($t.'.community_id', app(CampusSpaces::class)->visibleCommunities($viewer)->select('communities.id')))
            ->whereHas('author', fn ($u) => $u->where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $viewer->affiliation->institution_id)))
            ->whereNotIn($t.'.user_id', DB::table('blocks')->select('target_id')->where('user_id', $viewer->id))
            ->whereNotIn($t.'.user_id', DB::table('blocks')->select('user_id')->where('target_id', $viewer->id))
            ->where(fn ($v) => $v->where($t.'.user_id', $viewer->id)->orWhere(fn ($v) => $v->where(fn ($v) => $v->where($t.'.visibility', 'campus')->orWhereExists($follow))->where(fn ($v) => $v->whereHas('author.profile', fn ($p) => $p->where('private_account', false))->orWhereExists($follow))));
    }

    public function query(User $viewer, ?Builder $query = null): Builder
    {
        $q = $this->base($viewer, $query);
        $t = $q->getModel()->getTable();

        return $q->whereNotExists(fn ($d) => $d->selectRaw('1')->from('post_dependencies')->whereColumn('post_dependencies.post_id', $t.'.id')->whereNotIn('post_dependencies.source_id', $this->base($viewer)->select('posts.id')));
    }

    public function find(User $viewer, int $id): Post
    {
        return $this->query($viewer)->findOrFail($id);
    }

    public function hydrate(Builder $q, User $viewer): Builder
    {
        return $q->with(['author.profile', 'author.affiliation.institution', 'author.affiliation.faculty', 'author.affiliation.department', 'author.affiliation.cohort', 'media', 'quote.author.profile', 'quote.media'])
            ->withCount(['reactions', 'reposts', 'replies' => fn ($r) => $this->query($viewer, $r)])
            ->withExists(['reactions as liked' => fn ($r) => $r->where('user_id', $viewer->id), 'reposts as reposted' => fn ($r) => $r->where('user_id', $viewer->id), 'bookmarks as bookmarked' => fn ($r) => $r->where('user_id', $viewer->id)]);
    }
}
