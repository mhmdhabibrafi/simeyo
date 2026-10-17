<?php

namespace App\Http\Controllers;

use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Models\PostMedia;
use App\Services\CampusActivity;
use App\Services\CampusSpaces;
use App\Services\DailyStreak;
use App\Services\PostEntities;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PostController extends Controller
{
    public function __construct(private PostVisibility $visibility) {}

    public function show(Request $r, int $post)
    {
        $p = $this->visibility->hydrate($this->visibility->query($r->user())->whereKey($post), $r->user())->firstOrFail();

        return new PostResource($p);
    }

    public function store(Request $r)
    {
        $d = $r->validate(['body' => 'present|nullable|string|max:1000', 'visibility' => 'required|in:campus,followers', 'parent_id' => 'nullable|integer|min:1', 'quote_id' => 'nullable|integer|min:1', 'media_ids' => 'sometimes|array', 'media_ids.*' => 'required|integer|distinct|min:1']);
        $d['body'] = (string) ($d['body'] ?? '');
        $r->validate(['client_id' => 'sometimes|nullable|uuid']);
        abort_unless(trim($d['body']) !== '' || count($d['media_ids'] ?? []) > 0, 422, 'Tulis cerita atau lampirkan gambar.');
        $p = DB::transaction(function () use ($r, $d) {
            // Serialize authors and media attachment; database uniqueness protects concurrent interaction writes.
            DB::table('users')->where('id', $r->user()->id)->lockForUpdate()->first();
            $fingerprint = hash('sha256', json_encode(['body' => trim($d['body']), 'visibility' => $d['visibility'], 'parent_id' => $d['parent_id'] ?? null, 'quote_id' => $d['quote_id'] ?? null, 'community_id' => $r->input('community_id'), 'media_ids' => $d['media_ids'] ?? []], JSON_THROW_ON_ERROR));
            if ($r->filled('client_id')) {
                $existing = Post::withTrashed()->where('user_id', $r->user()->id)->where('client_id', $r->input('client_id'))->first();
                if ($existing) {
                    abort_if($existing->trashed() || $existing->request_hash !== $fingerprint, 409, 'Identitas draf sudah digunakan. Periksa cerita yang sudah dikirim.');

                    return $this->visibility->find($r->user(), $existing->id);
                }
            }
            $communityId = $r->input('community_id');
            if ($communityId !== null) {
                $r->validate(['community_id' => 'integer|min:1']);
                $community = app(CampusSpaces::class)->visibleCommunities($r->user())->findOrFail($communityId);
                app(CampusSpaces::class)->assertMember($r->user(), $community);
            }
            $parent = isset($d['parent_id']) ? $this->visibility->find($r->user(), $d['parent_id']) : null;
            if ($parent?->community_id) {
                abort_if($communityId && (int) $communityId !== $parent->community_id, 422);
                $communityId = $parent->community_id;
                app(CampusSpaces::class)->assertMember($r->user(), app(CampusSpaces::class)->visibleCommunities($r->user())->findOrFail($communityId));
            }
            $quote = isset($d['quote_id']) ? $this->visibility->find($r->user(), $d['quote_id']) : null;
            abort_if($parent && $parent->depth >= 12, 422, 'Thread mencapai batas 12 tingkat. Mulai percakapan baru.');
            $ids = $d['media_ids'] ?? [];
            $media = PostMedia::whereIn('id', $ids)->where('user_id', $r->user()->id)->whereNull('post_id')->lockForUpdate()->get();
            abort_unless(count($ids) === $media->count(), 422, 'Lampiran tidak tersedia atau bukan milikmu.');
            $p = new Post(['body' => trim($d['body']), 'visibility' => $d['visibility']]);
            $p->forceFill(['user_id' => $r->user()->id, 'institution_id' => $r->user()->affiliation->institution_id, 'parent_id' => $parent?->id, 'root_id' => $parent?->root_id ?? $parent?->id, 'quote_id' => $quote?->id, 'depth' => $parent ? $parent->depth + 1 : 0])->save();
            $p->forceFill(['community_id' => $communityId])->save();
            $p->forceFill(['client_id' => $r->input('client_id'), 'request_hash' => $r->filled('client_id') ? $fingerprint : null])->save();
            $sources = array_filter([$parent?->id, $quote?->id]);
            $dependencies = DB::table('post_dependencies')->whereIn('post_id', $sources)->pluck('source_id')->merge($sources)->unique();
            abort_if($dependencies->count() > 100, 422, 'Terlalu banyak referensi berantai.');
            foreach ($dependencies as $source) {
                DB::table('post_dependencies')->insert(['post_id' => $p->id, 'source_id' => $source]);
            }
            $ownedMedia = $media->keyBy('id');
            foreach ($ids as $position => $id) {
                $ownedMedia[$id]->forceFill(['post_id' => $p->id, 'position' => $position])->save();
            }
            app(DailyStreak::class)->record($r->user()->id);
            app(PostEntities::class)->sync($p);
            if ($parent) {
                app(CampusActivity::class)->send($parent->author, $r->user(), 'replies', ['post_id' => $p->id]);
            }
            if ($quote) {
                app(CampusActivity::class)->send($quote->author, $r->user(), 'reposts', ['post_id' => $p->id]);
            }

            return $p;
        });

        return $this->show($r, $p->id)->response()->setStatusCode(201);
    }

    public function update(Request $r, int $post)
    {
        $p = $this->visibility->find($r->user(), $post);
        Gate::authorize('update', $p);
        $d = $r->validate(['body' => 'present|nullable|string|max:1000', 'visibility' => 'required|in:campus,followers']);
        $d['body'] = (string) ($d['body'] ?? '');
        abort_unless(trim($d['body']) !== '' || $p->media()->exists(), 422, 'Isi tidak boleh kosong.');
        $p->forceFill($d + ['edited_at' => now()])->save();
        app(PostEntities::class)->sync($p);

        return $this->show($r, $post);
    }

    public function destroy(Request $r, int $post)
    {
        $p = Post::findOrFail($post);
        Gate::authorize('delete', $p);
        $p->delete();

        return response()->noContent();
    }

    public function interaction(Request $r, int $post, string $kind)
    {
        $p = $this->visibility->find($r->user(), $post);
        $table = match ($kind) {
            'like' => 'post_reactions','repost' => 'post_reposts','bookmark' => 'bookmarks',default => abort(404)
        };
        if ($r->isMethod('put')) {
            $inserted = DB::table($table)->insertOrIgnore(['user_id' => $r->user()->id, 'post_id' => $p->id, 'created_at' => now(), 'updated_at' => now()]);
            if ($inserted && $kind !== 'bookmark') {
                app(CampusActivity::class)->send($p->author, $r->user(), $kind === 'like' ? 'likes' : 'reposts', ['post_id' => $p->id]);
            }
        } else {
            DB::table($table)->where('user_id', $r->user()->id)->where('post_id', $p->id)->delete();
        }

        return $this->show($r, $post);
    }

    public function report(Request $r, int $post)
    {
        $p = $this->visibility->find($r->user(), $post);
        $d = $r->validate(['reason' => 'required|in:spam,harassment,hate,misinformation,other', 'details' => 'nullable|string|max:1000']);
        DB::table('reports')->insertOrIgnore($d + ['user_id' => $r->user()->id, 'post_id' => $p->id, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'Laporan diterima.'], 201);
    }
}
