<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageStorage
{
    public function save(UploadedFile $file, string $directory, int $maxDimension): array
    {
        $image = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        abort_unless($image, 422, 'Gambar tidak dapat dibaca.');
        $w = imagesx($image);
        $h = imagesy($image);
        $ratio = min(1, $maxDimension / max($w, $h));
        $out = imagecreatetruecolor(max(1, (int) ($w * $ratio)), max(1, (int) ($h * $ratio)));
        imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
        imagecopyresampled($out, $image, 0, 0, 0, 0, imagesx($out), imagesy($out), $w, $h);
        ob_start();
        imagejpeg($out, null, 85);
        $bytes = ob_get_clean();
        $width = imagesx($out);
        $height = imagesy($out);
        imagedestroy($image);
        imagedestroy($out);
        $path = $directory.'/'.Str::uuid().'.jpg';
        Storage::disk(config('ruang.media_disk'))->put($path, $bytes);

        return ['path' => $path, 'width' => $width, 'height' => $height, 'bytes' => strlen($bytes)];
    }
}
