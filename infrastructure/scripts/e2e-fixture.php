<?php
// Browser test helper is local-only and restricted to synthetic e2e_* accounts.
require __DIR__.'/../../apps/api/vendor/autoload.php';
$app=require __DIR__.'/../../apps/api/bootstrap/app.php';$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(!app()->environment('local'))throw new RuntimeException('E2E helper requires APP_ENV=local.');
$username=$argv[1] ?? '';if(!preg_match('/^e2e_[a-z0-9_]{1,19}$/',$username))throw new RuntimeException('Synthetic username required.');
$user=\App\Models\User::where('username',$username)->firstOrFail();
echo \Illuminate\Support\Facades\URL::temporarySignedRoute('verification.verify',now()->addMinutes(5),['id'=>$user->id,'hash'=>sha1($user->email)]);
