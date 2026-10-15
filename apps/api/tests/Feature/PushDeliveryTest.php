<?php

namespace Tests\Feature;

use App\Jobs\CheckPushReceipt;
use App\Jobs\SendActivityPush;
use App\Models\Institution;
use App\Models\PushDevice;
use App\Models\User;
use App\Services\CampusActivity;
use App\Services\NotificationVisibility;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PushDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(InstitutionSeeder::class);
        config(['push.enabled' => false]);
        Http::preventStrayRequests();
    }

    private function member(): User
    {
        $u = User::factory()->create(['username' => 'push_'.bin2hex(random_bytes(4)), 'verification_state' => 'approved', 'onboarded_at' => now()]);
        $u->profile()->create();
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);

        return $u;
    }

    private function device(User $u): PushDevice
    {
        $access = $u->createToken('Android', ['campus'], now()->addDay());

        return PushDevice::create(['user_id' => $u->id, 'personal_access_token_id' => $access->accessToken->id, 'token_hash' => hash('sha256', 'ExpoPushToken[test-token]'), 'token' => 'ExpoPushToken[test-token]', 'name' => 'Android', 'platform' => 'android']);
    }

    public function test_push_registration_requires_native_scope_validates_token_and_logout_revokes_device(): void
    {
        $u = $this->member();
        $this->actingAs($u)->putJson('/api/v1/push-devices', ['token' => 'ExpoPushToken[valid]', 'platform' => 'android', 'name' => 'Android'])->assertForbidden();
        $this->app['auth']->forgetGuards();
        $access = $u->createToken('Android', ['campus'], now()->addDay());
        $this->withToken($access->plainTextToken)->putJson('/api/v1/push-devices', ['token' => 'https://evil.example/push', 'platform' => 'android', 'name' => 'Android'])->assertUnprocessable();
        $data = ['token' => 'ExpoPushToken[valid-token]', 'platform' => 'android', 'name' => 'Android'];
        $id = $this->putJson('/api/v1/push-devices', $data)->assertCreated()->assertJsonMissingPath('data.token')->json('data.id');
        $this->putJson('/api/v1/push-devices', $data)->assertCreated()->assertJsonPath('data.id', $id);
        $this->assertSame(1, PushDevice::count());
        $this->assertNotSame($data['token'], DB::table('push_devices')->value('token'));
        $this->assertSame($data['token'], PushDevice::first()->token);
        $this->postJson('/api/v1/auth/native/logout')->assertNoContent();
        $this->assertSame(0, PushDevice::count());
    }

    public function test_push_contains_no_private_content_is_retry_safe_and_receipts_revoke_invalid_devices(): void
    {
        Queue::fake();
        $u = $this->member();
        $actor = $this->member();
        $device = $this->device($u);
        app(CampusActivity::class)->send($u, $actor, 'follows');
        $nid = $u->notifications()->first()->id;
        config(['push.enabled' => true]);
        Http::fake(['https://exp.host/--/api/v2/push/send' => Http::response(['data' => ['status' => 'ok', 'id' => 'receipt-test']], 200), 'https://exp.host/--/api/v2/push/getReceipts' => Http::response(['data' => ['receipt-test' => ['status' => 'error', 'details' => ['error' => 'DeviceNotRegistered']]]], 200)]);
        $job = new SendActivityPush($u->id, $nid);
        $job->handle(app(NotificationVisibility::class));
        $job->handle(app(NotificationVisibility::class));
        Http::assertSentCount(1);
        Http::assertSent(fn ($r) => $r['body'] === 'Ada aktivitas kampus baru. Buka Simeyo untuk melihatnya.' && ! str_contains(json_encode($r->data()), $actor->username) && $r['data']['notification_id'] === $nid);
        $this->assertDatabaseHas('push_receipts', ['receipt_id' => 'receipt-test', 'state' => 'accepted']);
        Queue::assertPushed(CheckPushReceipt::class);
        (new CheckPushReceipt('receipt-test'))->handle();
        $this->assertDatabaseHas('push_receipts', ['receipt_id' => 'receipt-test', 'state' => 'error']);
        $this->assertDatabaseMissing('push_devices', ['id' => $device->id]);
    }

    public function test_push_rechecks_blocks_preferences_expired_tokens_and_device_ownership(): void
    {
        Queue::fake();
        $u = $this->member();
        $actor = $this->member();
        $device = $this->device($u);
        app(CampusActivity::class)->send($u, $actor, 'follows');
        $nid = $u->notifications()->first()->id;
        config(['push.enabled' => true]);
        DB::table('blocks')->insert(['user_id' => $u->id, 'target_id' => $actor->id, 'created_at' => now(), 'updated_at' => now()]);
        (new SendActivityPush($u->id, $nid))->handle(app(NotificationVisibility::class));
        Http::assertNothingSent();
        DB::table('blocks')->delete();
        $u->profile->update(['notification_preferences' => ['follows' => false]]);
        (new SendActivityPush($u->id, $nid))->handle(app(NotificationVisibility::class));
        Http::assertNothingSent();
        $u->profile->update(['notification_preferences' => []]);
        $device->accessToken->forceFill(['expires_at' => now()->subMinute()])->save();
        (new SendActivityPush($u->id, $nid))->handle(app(NotificationVisibility::class));
        Http::assertNothingSent();
        $other = $this->member();
        $this->actingAs($other)->getJson('/api/v1/push-devices')->assertForbidden();
    }
}
