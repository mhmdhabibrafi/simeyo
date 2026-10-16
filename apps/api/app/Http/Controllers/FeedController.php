<?php

namespace App\Http\Controllers;

use App\Http\Resources\PostResource;
use App\Models\FeedSnapshot;
use App\Models\User;
use App\Services\CampusSpaces;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FeedController extends Controller
{
    public function __construct(private PostVisibility $visibility) {}

    public function preferences(Request $r)
    {
        if ($r->isMethod('delete')) {
            DB::table('feed_preferences')->where('user_id', $r->user()->id)->delete();

            return response()->noContent();
        }

        return ['data' => ['hidden_count' => DB::table('feed_preferences')->where('user_id', $r->user()->id)->count(), 'reduced_authors_count' => DB::table('feed_preferences')->join('posts', 'posts.id', '=', 'feed_preferences.post_id')->where('feed_preferences.user_id', $r->user()->id)->where('reduce_author', true)->distinct()->count('posts.user_id')]];
    }

    public function feedback(Request $r, int $post)
    {
        if ($r->isMethod('delete')) {
            DB::table('feed_preferences')->where('user_id', $r->user()->id)->where('post_id', $post)->delete();

            return response()->noContent();
        }
        $this->visibility->find($r->user(), $post);
        $d = $r->validate(['reduce_author' => 'required|boolean']);
        DB::table('feed_preferences')->upsert([['user_id' => $r->user()->id, 'post_id' => $post, 'reduce_author' => $d['reduce_author'], 'created_at' => now(), 'updated_at' => now()]], ['user_id', 'post_id'], ['reduce_author', 'updated_at']);

        return response()->noContent();
    }

    public function index(Request $r)
    {
        $d = $r->validate(['feed' => 'sometimes|in:for-you,following,campus,bookmarks,profile,replies,media', 'cursor' => 'nullable|string|max:4096', 'user_id' => 'sometimes|integer|min:1', 'parent_id' => 'sometimes|integer|min:1', 'limit' => 'sometimes|integer|min:1|max:30']);
        $feed = $d['feed'] ?? 'campus';
        $limit = (int) ($d['limit'] ?? 15);
        $q = $this->visibility->query($r->user());
        if ($r->filled('community_id')) {
            $r->validate(['community_id' => 'integer|min:1']);
            $c = app(CampusSpaces::class)->visibleCommunities($r->user())->findOrFail($r->integer('community_id'));
            $q->where('posts.community_id', $c->id);
        }
        $repostedBy = null;
        if (isset($d['parent_id'])) {
            $this->visibility->find($r->user(), $d['parent_id']);
            $q->where('parent_id', $d['parent_id']);
        } elseif ($feed !== 'replies') {
            $q->whereNull('parent_id');
        }
        if (in_array($feed, ['profile', 'replies', 'media'], true)) {
            $u = User::findOrFail($d['user_id'] ?? $r->user()->id);
            $this->visibility->assertProfile($r->user(), $u);
            if ($u->profile?->private_account && $u->id !== $r->user()->id && ! $this->visibility->follows($r->user(), $u)) {
                return ['data' => [], 'meta' => ['next_cursor' => null, 'has_more' => false, 'feed' => $feed]];
            }
            if ($feed === 'profile') {
                $q->where(fn ($p) => $p->where('posts.user_id', $u->id)->orWhereHas('reposts', fn ($x) => $x->where('user_id', $u->id)));
                $repostedBy = $u;
            } else {
                $q->where('posts.user_id', $u->id);
            }
            if ($feed === 'replies' && ! isset($d['parent_id'])) {
                $q->whereNotNull('parent_id');
            }
            if ($feed === 'media') {
                $q->whereHas('media');
            }
        }
        if ($feed === 'following') {
            $actors = User::where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $r->user()->affiliation->institution_id))->whereNotIn('id', DB::table('blocks')->select('target_id')->where('user_id', $r->user()->id))->whereNotIn('id', DB::table('blocks')->select('user_id')->where('target_id', $r->user()->id))->select('users.id');
            $following = DB::table('follows')->select('followed_id')->where('follower_id', $r->user()->id)->where('state', 'accepted')->whereIn('followed_id', $actors)->whereNotIn('followed_id', DB::table('mutes')->select('target_id')->where('user_id', $r->user()->id));
            $q->where(fn ($p) => $p->whereIn('posts.user_id', $following)->orWhereHas('reposts', fn ($x) => $x->whereIn('user_id', $following)));
        }
        if ($feed === 'bookmarks') {
            $q->whereHas('bookmarks', fn ($b) => $b->where('user_id', $r->user()->id));
        }
        if (in_array($feed, ['for-you', 'following', 'campus'], true)) {
            $q->whereNotIn('posts.id', DB::table('feed_preferences')->select('post_id')->where('user_id', $r->user()->id));
            $q->whereNotIn('posts.user_id', DB::table('mutes')->select('target_id')->where('user_id', $r->user()->id));
        }
        if ($feed === 'for-you') {
            return $this->recommendations($r, $q, $limit, $d['cursor'] ?? null);
        }
        $page = $this->visibility->hydrate($q, $r->user())->orderByDesc('posts.id')->cursorPaginate($limit, ['*'], 'cursor', $d['cursor'] ?? null);
        if ($repostedBy) {
            foreach ($page->items() as $p) {
                if ($p->user_id !== $repostedBy->id) {
                    $p->setAttribute('reposted_by', $repostedBy->username);
                }
            }
        }

        return ['data' => PostResource::collection($page->items()), 'meta' => ['next_cursor' => $page->nextCursor()?->encode(), 'has_more' => $page->hasMorePages(), 'feed' => $feed]];
    }

    private function recommendations(Request $r, $q, int $limit, ?string $cursor)
    {
        if ($cursor) {
            try {
                $c = json_decode(Crypt::decryptString($cursor), true, 8, JSON_THROW_ON_ERROR);
                abort_unless(is_array($c) && isset($c['snapshot'],$c['position']) && is_int($c['position']) && $c['position'] >= 0, 422);
            } catch (\Throwable $e) {
                abort(422, 'Cursor tidak valid.');
            }
            $snapshot = FeedSnapshot::whereKey($c['snapshot'])->where('user_id', $r->user()->id)->first();
            abort_unless($snapshot && $snapshot->expires_at->isFuture(), 410, 'Feed kedaluwarsa. Muat ulang untuk cerita terbaru.');
            $position = $c['position'];
        } else {
            FeedSnapshot::where('expires_at', '<', now())->delete();
            $following = DB::table('follows')->where('follower_id', $r->user()->id)->where('state', 'accepted')->pluck('followed_id')->all();
            // Recommendation window is intentionally bounded; Campus exposes the full chronological history.
            $candidates = (clone $q)->where('posts.created_at', '>=', now()->subDays(7))->withCount(['reactions', 'reposts', 'replies' => fn ($x) => $this->visibility->query($r->user(), $x)])->orderByDesc('posts.id')->limit(1000)->get();
            $now = now();
            $reduced = DB::table('feed_preferences')->join('posts', 'posts.id', '=', 'feed_preferences.post_id')->where('feed_preferences.user_id', $r->user()->id)->where('reduce_author', true)->pluck('posts.user_id')->all();
            $ids = $candidates->sortByDesc(fn ($p) => (24 / (1 + max(0, $p->created_at->diffInHours($now))) + min($p->reactions_count, 20) * 0.5 + min($p->reposts_count, 10) + min($p->replies_count, 10) * 1.5 + (in_array($p->user_id, $following, true) ? 4 : 0) + $p->id / 1e12) * (in_array($p->user_id, $reduced, true) ? 0.25 : 1))->pluck('id')->all();
            $snapshot = FeedSnapshot::create(['id' => (string) Str::uuid(), 'user_id' => $r->user()->id, 'post_ids' => $ids, 'expires_at' => now()->addMinutes(15)]);
            $position = 0;
        }
        $ids = $snapshot->post_ids;
        $selected = [];
        while (count($selected) < $limit && $position < count($ids)) {
            $chunk = array_slice($ids, $position, $limit - count($selected));
            $visible = (clone $q)->whereIn('posts.id', $chunk)->pluck('posts.id')->all();
            foreach ($chunk as $id) {
                $position++;
                if (in_array($id, $visible, true)) {
                    $selected[] = $id;
                }
            }
        }
        $posts = $this->visibility->hydrate((clone $q)->whereIn('posts.id', $selected), $r->user())->get()->keyBy('id');
        $ordered = collect($selected)->map(fn ($id) => $posts->get($id))->filter()->values();
        $more = $position < count($ids);

        return ['data' => PostResource::collection($ordered), 'meta' => ['next_cursor' => $more ? Crypt::encryptString(json_encode(['snapshot' => $snapshot->id, 'position' => $position])) : null, 'has_more' => $more, 'feed' => 'for-you', 'ranking' => 'hidden stories excluded; reduced authors score x0.25 on new snapshots; recency + capped actual engagement + accepted follows; 7-day window, at most 1000 candidates, frozen for 15 minutes']];
    }
}
