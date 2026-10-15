<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Services use Laravel's container defaults.
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', fn (Request $r) => [
            Limit::perMinute(10)->by($r->ip()),
            Limit::perMinute(5)->by(strtolower((string) $r->input('email')).'|'.$r->ip()),
        ]);
        ResetPassword::createUrlUsing(fn ($user, $token) => config('ruang.frontend_url').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));
        foreach (['api' => 240, 'catalog' => 60, 'verification-submit' => 3, 'email-resend' => 3, 'email-verify' => 6, 'profile-media' => 10, 'posts' => 10, 'reports' => 5, 'messages' => 30] as $name => $limit) {
            RateLimiter::for($name, fn (Request $r) => Limit::perMinute($limit)->by((string) ($r->user()?->id ?? $r->ip())));
        }
    }
}
