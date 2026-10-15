<?php

// Only the disposable CI database and runner temporary directory may be used.
if (getenv('CI') !== 'true' || getenv('GITHUB_ACTIONS') !== 'true'
    || !in_array(getenv('DB_DATABASE'), ['ruang_test', 'simeyo_restore_application_ci'], true)) {
    throw new RuntimeException('Application recovery drill requires isolated GitHub CI.');
}
$directory = getenv('RECOVERY_MEDIA_DIRECTORY');
$temporary = realpath(getenv('RUNNER_TEMP') ?: '');
if (!$directory || !$temporary || dirname($directory) !== $temporary || basename($directory) !== 'simeyo-recovery') {
    throw new RuntimeException('Recovery files must use the designated runner temporary directory.');
}
require __DIR__.'/../../apps/api/vendor/autoload.php';
$app = require __DIR__.'/../../apps/api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$check = static function (bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
};
$path = 'avatars/recovery.png';
$plaintext = 'ExponentPushToken[synthetic-recovery-never-send]';
$phase = $argv[1] ?? '';
if ($phase === 'prepare' && getenv('DB_DATABASE') === 'ruang_test') {
    $check(!file_exists($directory), 'Refusing to overwrite recovery files.');
    $check(mkdir($directory, 0700), 'Cannot create private recovery directory.');
    $source = Illuminate\Support\Facades\Storage::build(['driver' => 'local', 'root' => "$directory/source", 'throw' => true]);
    $source->put($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', true));
    $user = App\Models\User::create(['name' => 'Recovery media fixture', 'username' => 'recovery_media', 'email' => 'recovery-media@example.invalid', 'password' => bin2hex(random_bytes(32))]);
    $user->profile()->create(['avatar_path' => $path]);
    $access = $user->createToken('recovery-only', ['native']);
    App\Models\PushDevice::create(['user_id' => $user->id, 'personal_access_token_id' => $access->accessToken->id, 'token_hash' => hash('sha256', $plaintext), 'token' => $plaintext, 'name' => 'Recovery fixture', 'platform' => 'android']);
    $archive = new ZipArchive;
    $check($archive->open("$directory/media.zip", ZipArchive::CREATE | ZipArchive::EXCL) === true, 'Cannot create media archive.');
    $check($archive->addFile($source->path($path), $path), 'Cannot archive private media.');
    $check($archive->close(), 'Cannot finish media archive.');
    file_put_contents("$directory/media.sha256", hash_file('sha256', "$directory/media.zip"));
    file_put_contents("$directory/content.sha256", hash('sha256', $source->get($path)));
    echo "Prepared private media and encrypted application fixture; no credentials exported.\n";
} elseif ($phase === 'verify' && getenv('DB_DATABASE') === 'simeyo_restore_application_ci') {
    $check(hash_equals(file_get_contents("$directory/media.sha256"), hash_file('sha256', "$directory/media.zip")), 'Media archive checksum differs.');
    $check(!file_exists("$directory/restored"), 'Refusing to overwrite restored media.');
    $archive = new ZipArchive;
    $check($archive->open("$directory/media.zip") === true, 'Cannot open media archive.');
    // This drill only extracts its own fixed fixture, never arbitrary archive paths.
    $check($archive->numFiles === 1 && $archive->getNameIndex(0) === $path, 'Unexpected archive entry.');
    $check($archive->extractTo("$directory/restored", [$path]), 'Cannot restore private media.');
    $archive->close();
    $user = App\Models\User::where('email', 'recovery-media@example.invalid')->firstOrFail();
    $restored = Illuminate\Support\Facades\Storage::build(['driver' => 'local', 'root' => "$directory/restored", 'throw' => true]);
    $check(hash_equals(file_get_contents("$directory/content.sha256"), hash('sha256', $restored->get($user->profile->avatar_path))), 'Restored profile media differs.');
    $device = App\Models\PushDevice::where('user_id', $user->id)->firstOrFail();
    $check($device->getRawOriginal('token') !== $plaintext && $device->token === $plaintext, 'Restored encrypted cast cannot decrypt with retained APP_KEY.');
    $wrongKey = new Illuminate\Encryption\Encrypter(random_bytes(32), 'AES-256-CBC');
    $rejected = false;
    try {
        $wrongKey->decrypt($device->getRawOriginal('token'));
    } catch (Illuminate\Contracts\Encryption\DecryptException) {
        $rejected = true;
    }
    $check($rejected, 'Wrong application key unexpectedly decrypted restored token.');
    echo "Application recovery passed: restored profile/media bytes, encrypted token with retained key, wrong-key rejection.\n";
} else {
    throw new RuntimeException('Invalid recovery phase or database.');
}
