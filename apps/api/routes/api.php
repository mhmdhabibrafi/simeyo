<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ExploreController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ModerationController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\PostMediaController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PushDeviceController;
use App\Http\Controllers\SocialGraphController;
use App\Http\Controllers\VerificationController;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('auth/options', [AuthController::class, 'options'])->middleware('throttle:catalog');
    Route::get('health', function () {
        DB::select('select 1');

        return ['status' => 'ok'];
    });
    Route::get('institutions', function () {
        return ['data' => Institution::all(['id', 'name', 'slug']),
            'faculties' => DB::table('faculties')->get(['id', 'institution_id', 'name']),
            'departments' => DB::table('departments')->get(['id', 'faculty_id', 'name']),
            'cohorts' => DB::table('academic_cohorts')->get(['id', 'institution_id', 'year'])];
    })->middleware('throttle:catalog');
    Route::post('auth/native/login', [AuthController::class, 'nativeLogin'])->middleware('throttle:auth');
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::post('auth/native/logout', [AuthController::class, 'nativeLogout']);
        Route::get('me', [ProfileController::class, 'me']);
        Route::put('me/password', [AuthController::class, 'changePassword'])->middleware('throttle:password-change');
        Route::get('notifications', [ActivityController::class, 'index']);
        Route::put('notifications/read', [ActivityController::class, 'readMany']);
        Route::put('notifications/{notification}/read', [ActivityController::class, 'read'])->whereUuid('notification');
        Route::patch('me', [ProfileController::class, 'update']);
        Route::post('onboarding', [ProfileController::class, 'onboarding']);
        Route::get('verification', [VerificationController::class, 'show']);
        Route::post('verification', [VerificationController::class, 'store'])->middleware('throttle:verification-submit');
        Route::delete('me/media/{kind}', [MediaController::class, 'destroy'])->whereIn('kind', ['avatar', 'cover']);
        Route::post('me/media', [MediaController::class, 'upload'])->middleware('throttle:profile-media');
        Route::middleware('campus')->group(function () {
            Route::get('push-config', fn () => ['data' => ['enabled' => (bool) config('push.enabled')]]);
            Route::get('push-devices', [PushDeviceController::class, 'index']);
            Route::put('push-devices', [PushDeviceController::class, 'store'])->middleware('throttle:profile-media');
            Route::delete('push-devices/{device}', [PushDeviceController::class, 'destroy'])->whereNumber('device');
            Route::get('admin/moderation', [ModerationController::class, 'index']);
            Route::get('admin/message-reports', [ModerationController::class, 'messageReports']);
            Route::patch('admin/message-reports/{report}', [ModerationController::class, 'reviewMessage'])->whereNumber('report');
            Route::patch('admin/moderation/{report}', [ModerationController::class, 'review'])->whereNumber('report');
            Route::get('admin/organizations', [ModerationController::class, 'organizations']);
            Route::patch('admin/organizations/{community}', [ModerationController::class, 'verify'])->whereNumber('community');
            Route::get('pulse', [ExploreController::class, 'pulse']);
            Route::get('search/posts', [ExploreController::class, 'search']);
            Route::get('search/topics', [ExploreController::class, 'topics']);
            Route::get('communities', [CommunityController::class, 'index']);
            Route::post('communities', [CommunityController::class, 'store'])->middleware('throttle:posts');
            Route::get('communities/{community}', [CommunityController::class, 'show'])->whereNumber('community');
            Route::patch('communities/{community}', [CommunityController::class, 'update'])->whereNumber('community');
            Route::delete('communities/{community}', [CommunityController::class, 'destroy'])->whereNumber('community');
            Route::match(['PUT', 'DELETE'], 'communities/{community}/membership', [CommunityController::class, 'join'])->whereNumber('community');
            Route::get('communities/{community}/members', [CommunityController::class, 'members'])->whereNumber('community');
            Route::patch('communities/{community}/members/{user}', [CommunityController::class, 'member'])->whereNumber(['community', 'user']);
            Route::get('events', [EventController::class, 'index']);
            Route::post('events', [EventController::class, 'store'])->middleware('throttle:posts');
            Route::get('events/{event}', [EventController::class, 'show'])->whereNumber('event');
            Route::patch('events/{event}', [EventController::class, 'update'])->whereNumber('event');
            Route::delete('events/{event}', [EventController::class, 'destroy'])->whereNumber('event');
            Route::match(['PUT', 'DELETE'], 'events/{event}/rsvp', [EventController::class, 'rsvp'])->whereNumber('event');
            Route::post('conversations/{conversation}/report', [MessageController::class, 'report'])->whereNumber('conversation')->middleware('throttle:reports');
            Route::get('conversations/unread', [MessageController::class, 'unread']);
            Route::match(['GET', 'PUT'], 'conversations/{conversation}/typing', [MessageController::class, 'typing'])->whereNumber('conversation');
            Route::get('conversations', [MessageController::class, 'index']);
            Route::post('conversations', [MessageController::class, 'start'])->middleware('throttle:messages');
            Route::get('conversations/{conversation}/messages', [MessageController::class, 'show'])->whereNumber('conversation');
            Route::post('conversations/{conversation}/messages', [MessageController::class, 'store'])->whereNumber('conversation')->middleware('throttle:messages');
            Route::put('conversations/{conversation}/read', [MessageController::class, 'read'])->whereNumber('conversation');
            Route::match(['GET', 'PATCH'], 'communication-preferences', [ActivityController::class, 'preferences']);
            Route::get('realtime', [ActivityController::class, 'realtime']);
            Route::match(['GET', 'DELETE'], 'feed/preferences', [FeedController::class, 'preferences']);
            Route::match(['PUT', 'DELETE'], 'posts/{post}/feedback', [FeedController::class, 'feedback'])->whereNumber('post');
            Route::get('feed', [FeedController::class, 'index']);
            Route::post('posts', [PostController::class, 'store'])->middleware('throttle:posts');
            Route::get('posts/{post}', [PostController::class, 'show'])->whereNumber('post');
            Route::patch('posts/{post}', [PostController::class, 'update'])->whereNumber('post');
            Route::delete('posts/{post}', [PostController::class, 'destroy'])->whereNumber('post');
            Route::match(['PUT', 'DELETE'], 'posts/{post}/interactions/{kind}', [PostController::class, 'interaction'])->whereNumber('post');
            Route::post('posts/{post}/report', [PostController::class, 'report'])->whereNumber('post')->middleware('throttle:reports');
            Route::post('media/posts', [PostMediaController::class, 'upload'])->middleware('throttle:profile-media');
            Route::get('media/posts/{media}', [PostMediaController::class, 'show'])->whereNumber('media');
            Route::delete('media/posts/{media}', [PostMediaController::class, 'destroy'])->whereNumber('media');
            Route::get('people', [SocialGraphController::class, 'people']);
            Route::get('follow-requests', [SocialGraphController::class, 'followRequests']);
            Route::patch('follow-requests/{user}', [SocialGraphController::class, 'decide'])->whereNumber('user');
            Route::get('relationships/{user}', [SocialGraphController::class, 'state'])->whereNumber('user');
            Route::match(['PUT', 'DELETE'], 'relationships/{user}/follow', [SocialGraphController::class, 'follow'])->whereNumber('user');
            Route::match(['PUT', 'DELETE'], 'relationships/{user}/{kind}', [SocialGraphController::class, 'edge'])->whereNumber('user');
            Route::get('privacy/{kind}', [SocialGraphController::class, 'edges']);
            Route::get('profiles/{user:username}', [ProfileController::class, 'show']);
            Route::get('campus', fn (Request $r) => ['data' => ['institution' => $r->user()->affiliation?->institution?->only(['id', 'name', 'slug'])]]);
            Route::get('admin/verifications', [VerificationController::class, 'index']);
            Route::patch('admin/verifications/{verificationRequest}', [VerificationController::class, 'review']);
        });
    });
});
