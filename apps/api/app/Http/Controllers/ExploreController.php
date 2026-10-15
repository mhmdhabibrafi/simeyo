<?php

namespace App\Http\Controllers;

use App\Http\Resources\PostResource;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExploreController extends Controller
{
    public function __construct(private PostVisibility $visibility) {}

    public function search(Request $r)
    {
        $d = $r->validate(['q' => 'required|string|max:80', 'cursor' => 'nullable|string|max:4096']);
        $term = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($d['q']));
        $q = $this->visibility->query($r->user())->whereRaw("LOWER(body) LIKE ? ESCAPE '!'", ['%'.$term.'%']);
        $p = $this->visibility->hydrate($q, $r->user())->orderByDesc('id')->cursorPaginate(20);

        return ['data' => PostResource::collection($p->items()), 'meta' => ['next_cursor' => $p->nextCursor()?->encode(), 'has_more' => $p->hasMorePages(), 'feed' => 'search']];
    }

    public function pulse(Request $r)
    {
        $visible = $this->visibility->query($r->user())->where('created_at', '>=', now()->subDay())->whereNotIn('user_id', DB::table('mutes')->select('target_id')->where('user_id', $r->user()->id));
        $topics = DB::table('hashtags')->join('post_hashtags', 'hashtag_id', '=', 'hashtags.id')->whereIn('post_id', (clone $visible)->select('posts.id'))->select('hashtags.name')->selectRaw('count(*) as posts_count')->groupBy('hashtags.name')->orderByDesc('posts_count')->orderBy('hashtags.name')->limit(10)->get();
        $q = $this->visibility->hydrate((clone $visible)->whereNull('parent_id'), $r->user())->orderByDesc('reactions_count')->orderByDesc('id')->limit(5);

        return ['data' => ['topics' => $topics, 'posts' => PostResource::collection($q->get()), 'explanation' => 'Topik: jumlah cerita yang dapat kamu akses dalam 24 jam. Cerita: jumlah suka, lalu waktu terbaru. Akun disenyapkan dikecualikan.']];
    }
}
