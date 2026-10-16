<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function upload(Request $r)
    {
        $d = $r->validate(['kind' => 'required|in:avatar,cover', 'image' => 'required|file|mimes:jpg,jpeg,png,webp|dimensions:max_width=4096,max_height=4096']);
        $file = $r->file('image');
        $image = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        abort_unless($image, 422, 'Gambar tidak dapat dibaca.');
        $limit = $d['kind'] === 'avatar' ? 512 : 1600;
        $w = imagesx($image);
        $h = imagesy($image);
        $ratio = min(1, $limit / max($w, $h));
        $output = imagecreatetruecolor(max(1, (int) ($w * $ratio)), max(1, (int) ($h * $ratio)));
        imagefill($output, 0, 0, imagecolorallocate($output, 255, 255, 255));
        imagecopyresampled($output, $image, 0, 0, 0, 0, imagesx($output), imagesy($output), $w, $h);
        ob_start();
        imagejpeg($output, null, 85);
        $bytes = ob_get_clean();
        imagedestroy($image);
        imagedestroy($output);
        $path = 'profiles/'.$r->user()->id.'/'.Str::uuid().'.jpg';
        Storage::disk(config('ruang.media_disk'))->put($path, $bytes);
        $p = $r->user()->profile()->firstOrCreate([]);
        $column = $d['kind'].'_path';
        $old = $p->$column;
        $p->update([$column => $path]);
        if ($old) {
            Storage::disk(config('ruang.media_disk'))->delete($old);
        }

        return ['data' => ['url' => '/media/'.$path]];
    }

    public function show(Request $r, string $userId, string $filename)
    {
        abort_unless(preg_match('/^[0-9a-f-]{36}\.jpg$/', $filename), 404);
        $user = User::findOrFail($userId);
        if ((string) $r->user()->id !== $userId) {
            abort_if(app(PostVisibility::class)->blocked($r->user(), $user), 404);
            abort_unless($r->user()->hasVerifiedEmail() && $r->user()->verification_state === 'approved' && $user->verification_state === 'approved' && $user->affiliation?->institution_id === $r->user()->affiliation?->institution_id, 403);
        }
        $path = 'profiles/'.$userId.'/'.$filename;
        abort_unless(in_array($path, [$user->profile?->avatar_path, $user->profile?->cover_path], true) && Storage::disk(config('ruang.media_disk'))->exists($path), 404);

        return Storage::disk(config('ruang.media_disk'))->response($path, null, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
