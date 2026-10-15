<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FirebaseAuthController;
use App\Http\Controllers\MediaController;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => ['name' => 'Simeyo API', 'version' => '0.3.0']);
Route::get('media/profiles/{userId}/{filename}', [MediaController::class, 'show'])->middleware('auth:sanctum');

Route::prefix('api/v1/auth')->group(function () {
    Route::post('firebase', [FirebaseAuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('forgot-password', [AuthController::class, 'forgot'])->middleware('throttle:auth');
    Route::post('reset-password', [AuthController::class, 'reset'])->middleware('throttle:auth');
    Route::middleware('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('sessions', [AuthController::class, 'sessions']);
        Route::delete('sessions/{id}', [AuthController::class, 'revokeSession']);
        Route::post('email/resend', [AuthController::class, 'resend'])->middleware('throttle:email-resend');
        Route::get('email/verify/{id}/{hash}', function (EmailVerificationRequest $r) {
            $r->fulfill();

            return redirect(config('ruang.frontend_url').'/onboarding');
        })->middleware(['signed', 'throttle:email-verify'])->name('verification.verify');
    });
});
