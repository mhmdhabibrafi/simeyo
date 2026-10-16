<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\CampusActivity;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SocialGraphController extends Controller
{
    public function __construct(private PostVisibility $visibility) {}

    public function state(Request $r, int $user)
    {
        $u = User::findOrFail($user);
        $this->visibility->assertProfile($r->user(), $u);

        return ['data' => ['followers_count' => DB::table('follows')->where('followed_id', $u->id)->where('state', 'accepted')->count(), 'following_count' => DB::table('follows')->where('follower_id', $u->id)->where('state', 'accepted')->count(), 'follow_state' => DB::table('follows')->where('follower_id', $r->user()->id)->where('followed_id', $u->id)->value('state'), 'muted' => DB::table('mutes')->where('user_id', $r->user()->id)->where('target_id', $u->id)->exists()]];
    }

    public function follow(Request $r, int $user)
    {
        $u = User::findOrFail($user);
        $this->visibility->assertProfile($r->user(), $u);
        abort_if($u->id === $r->user()->id, 422, 'Tidak dapat mengikuti diri sendiri.');
        DB::transaction(function () use ($r, $u) {
            DB::table('users')->whereIn('id', [$u->id, $r->user()->id])->orderBy('id')->lockForUpdate()->get();
            $u->refresh();
            $this->visibility->assertProfile($r->user(), $u);
            if ($r->isMethod('put')) {
                $existing = DB::table('follows')->where('follower_id', $r->user()->id)->where('followed_id', $u->id)->value('state');
                DB::table('follows')->updateOrInsert(['follower_id' => $r->user()->id, 'followed_id' => $u->id], ['state' => $existing === 'accepted' ? 'accepted' : ($u->profile?->private_account ? 'pending' : 'accepted'), 'created_at' => now(), 'updated_at' => now()]);
                if (! $existing) {
                    app(CampusActivity::class)->send($u, $r->user(), 'follows');
                }
            } else {
                DB::table('follows')->where('follower_id', $r->user()->id)->where('followed_id', $u->id)->delete();
            }
        });

        return $this->state($r, $user);
    }

    public function followRequests(Request $r)
    {
        return ['data' => DB::table('follows')->join('users', 'users.id', '=', 'follows.follower_id')->where('followed_id', $r->user()->id)->where('state', 'pending')->orderBy('follows.id')->get(['users.id', 'users.name', 'users.username'])];
    }

    public function decide(Request $r, int $user)
    {
        $r->validate(['accept' => 'required|boolean']);
        $u = User::findOrFail($user);
        $this->visibility->assertProfile($r->user(), $u);
        $q = DB::table('follows')->where('follower_id', $u->id)->where('followed_id', $r->user()->id)->where('state', 'pending');
        if ($r->boolean('accept')) {
            $q->update(['state' => 'accepted', 'updated_at' => now()]);
        } else {
            $q->delete();
        }

        return response()->noContent();
    }

    public function edge(Request $r, int $user, string $kind)
    {
        abort_unless(in_array($kind, ['block', 'mute'], true), 404);
        $u = User::findOrFail($user);
        abort_if($u->id === $r->user()->id, 422);
        abort_unless($u->affiliation?->institution_id === $r->user()->affiliation->institution_id, 404);
        DB::transaction(function () use ($r, $u, $kind) {
            DB::table('users')->whereIn('id', [$u->id, $r->user()->id])->orderBy('id')->lockForUpdate()->get();
            $table = $kind === 'block' ? 'blocks' : 'mutes';
            if ($r->isMethod('put')) {
                DB::table($table)->insertOrIgnore(['user_id' => $r->user()->id, 'target_id' => $u->id, 'created_at' => now(), 'updated_at' => now()]);
                if ($kind === 'block') {
                    DB::table('follows')->where(fn ($q) => $q->where('follower_id', $r->user()->id)->where('followed_id', $u->id))->orWhere(fn ($q) => $q->where('follower_id', $u->id)->where('followed_id', $r->user()->id))->delete();
                }
            } else {
                DB::table($table)->where('user_id', $r->user()->id)->where('target_id', $u->id)->delete();
            }
        });

        return response()->noContent();
    }

    public function edges(Request $r, string $kind)
    {
        abort_unless(in_array($kind, ['blocks', 'mutes'], true), 404);

        return ['data' => DB::table($kind)->join('users', 'users.id', '=', $kind.'.target_id')->where($kind.'.user_id', $r->user()->id)->get(['users.id', 'users.name', 'users.username'])];
    }

    public function people(Request $r)
    {
        $d = $r->validate(['q' => 'sometimes|string|max:80', 'cursor' => 'nullable|string|max:4096', 'relation' => 'sometimes|in:followers,following', 'user_id' => 'sometimes|integer', 'context' => 'sometimes|in:messages']);
        $q = User::where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $r->user()->affiliation->institution_id))->whereNotIn('id', DB::table('blocks')->select('target_id')->where('user_id', $r->user()->id))->whereNotIn('id', DB::table('blocks')->select('user_id')->where('target_id', $r->user()->id));
        if (($d['context'] ?? null) === 'messages') {
            $q->where('id', '!=', $r->user()->id);
        }
        if (isset($d['q'])) {
            $search = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $d['q']);
            $q->where(fn ($u) => $u->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", ['%'.mb_strtolower($search).'%'])->orWhereRaw("LOWER(username) LIKE ? ESCAPE '!'", ['%'.mb_strtolower($search).'%']));
        }
        if (isset($d['relation'])) {
            $u = User::findOrFail($d['user_id'] ?? $r->user()->id);
            $this->visibility->assertProfile($r->user(), $u);
            abort_if($u->profile?->private_account && $u->id !== $r->user()->id && ! $this->visibility->follows($r->user(), $u), 403);
            $following = $d['relation'] === 'following';
            $q->whereIn('id', DB::table('follows')->select($following ? 'followed_id' : 'follower_id')->where($following ? 'follower_id' : 'followed_id', $u->id)->where('state', 'accepted'));
        } elseif (! isset($d['q']) && ($d['context'] ?? null) !== 'messages') {
            $q->where('id', '!=', $r->user()->id)->whereNotIn('id', DB::table('follows')->select('followed_id')->where('follower_id', $r->user()->id))->whereNotIn('id', DB::table('mutes')->select('target_id')->where('user_id', $r->user()->id));
        }
        $q->addSelect(['users.*', 'social_followers' => DB::table('follows')->selectRaw('count(*)')->whereColumn('followed_id', 'users.id')->where('state', 'accepted'),
            'social_following' => DB::table('follows')->selectRaw('count(*)')->whereColumn('follower_id', 'users.id')->where('state', 'accepted'),
            'social_state' => DB::table('follows')->select('state')->whereColumn('followed_id', 'users.id')->where('follower_id', $r->user()->id)->limit(1),
            'social_muted' => DB::table('mutes')->selectRaw('count(*)')->whereColumn('target_id', 'users.id')->where('user_id', $r->user()->id)]);
        $p = $q->with(['profile', 'affiliation.institution', 'affiliation.faculty', 'affiliation.department', 'affiliation.cohort'])->orderByDesc('id')->cursorPaginate(20, ['*'], 'cursor', $d['cursor'] ?? null);

        return ['data' => UserResource::collection($p->items()), 'meta' => ['next_cursor' => $p->nextCursor()?->encode(), 'has_more' => $p->hasMorePages()]];
    }
}
