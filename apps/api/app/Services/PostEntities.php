<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PostEntities
{
    public function sync(Post $p, bool $notify = true): void
    {
        preg_match_all('/(?<![\pL\pN_])#([\pL\pN_]{2,40})(?![\pL\pN_])/u', $p->body, $matches);
        DB::table('post_hashtags')->where('post_id', $p->id)->delete();
        foreach (array_unique(array_map('mb_strtolower', array_slice($matches[1], 0, 20))) as $name) {
            DB::table('hashtags')->insertOrIgnore(['name' => $name]);
            $id = DB::table('hashtags')->where('name', $name)->value('id');
            DB::table('post_hashtags')->insertOrIgnore(['post_id' => $p->id, 'hashtag_id' => $id]);
        }
        preg_match_all('/(?<![\pL\pN_])@([a-zA-Z0-9_]{3,30})(?![a-zA-Z0-9_])/u', $p->body, $mentions);
        $old = DB::table('post_mentions')->where('post_id', $p->id)->pluck('user_id')->all();
        DB::table('post_mentions')->where('post_id', $p->id)->delete();
        foreach (User::whereIn('username', array_unique(array_map('strtolower', array_slice($mentions[1], 0, 20))))->where('verification_state', 'approved')->whereHas('affiliation', fn ($q) => $q->where('institution_id', $p->institution_id))->get() as $user) {
            if (! app(PostVisibility::class)->query($user)->whereKey($p->id)->exists()) {
                continue;
            }DB::table('post_mentions')->insertOrIgnore(['post_id' => $p->id, 'user_id' => $user->id]);
            if ($notify && ! in_array($user->id, $old, true)) {
                app(CampusActivity::class)->send($user, $p->author, 'mentions', ['post_id' => $p->id]);
            }
        }
    }
}
