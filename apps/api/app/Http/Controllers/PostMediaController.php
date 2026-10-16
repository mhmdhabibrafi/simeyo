<?php

namespace App\Http\Controllers;

use App\Models\PostMedia;
use App\Services\ImageStorage;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PostMediaController extends Controller
{
    public function upload(Request $r, ImageStorage $images)
    {
        $r->validate(['image' => 'required|file|mimes:jpg,jpeg,png,webp|dimensions:max_width=4096,max_height=4096']);
        $data = $images->save($r->file('image'), 'posts/'.$r->user()->id, 1920);
        try {
            $m = PostMedia::create($data + ['user_id' => $r->user()->id]);
        } catch (\Throwable $e) {
            Storage::disk(config('ruang.media_disk'))->delete($data['path']);
            throw $e;
        }

        return response()->json(['data' => ['id' => $m->id, 'url' => '/api/v1/media/posts/'.$m->id, 'width' => $m->width, 'height' => $m->height]], 201);
    }

    public function show(Request $r, int $media, PostVisibility $visibility)
    {
        $m = PostMedia::findOrFail($media);
        if ($m->post_id) {
            $visibility->find($r->user(), $m->post_id);
        } else {
            abort_unless($m->user_id === $r->user()->id, 404);
        }
        abort_unless(Storage::disk(config('ruang.media_disk'))->exists($m->path), 404);

        return Storage::disk(config('ruang.media_disk'))->response($m->path, null, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function destroy(Request $r, int $media)
    {
        $m = PostMedia::findOrFail($media);
        abort_unless($m->user_id === $r->user()->id && ! $m->post_id, 403);
        Storage::disk(config('ruang.media_disk'))->delete($m->path);
        $m->delete();

        return response()->noContent();
    }
}
