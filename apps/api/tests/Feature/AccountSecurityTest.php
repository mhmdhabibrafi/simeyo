<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_domain_policy_accepts_exact_campus_domains_without_granting_verification(): void
    {
        Notification::fake();
        config(['registration.email_domains' => ['students.uin-suska.ac.id', 'uin-suska.ac.id']]);
        $this->getJson('/api/v1/auth/options')->assertOk()->assertJsonPath('data.email_domains.0', 'students.uin-suska.ac.id');
        foreach (['campus@students.uin-suska.ac.id.evil.test', 'campus@fake.uin-suska.ac.id', 'campus@example.test'] as $email) {
            $this->postJson('/api/v1/auth/register', $this->registration($email))->assertUnprocessable()->assertJsonValidationErrors('email');
        }
        $this->postJson('/api/v1/auth/register', $this->registration('CAMPUS@STUDENTS.UIN-SUSKA.AC.ID'))->assertCreated()->assertJsonPath('data.email_verified', false)->assertJsonPath('data.verified', false)->assertJsonPath('data.can_review_verifications', false);
        Notification::assertSentTo(User::first(), VerifyEmail::class);
        $rootDomain = $this->registration('lecturer@uin-suska.ac.id');
        $rootDomain['username'] = 'campus_lecturer';
        $this->postJson('/api/v1/auth/register', $rootDomain)->assertCreated()->assertJsonPath('data.verified', false)->assertJsonPath('data.can_review_verifications', false);
    }

    public function test_disabled_delivery_rejects_email_actions_without_creating_accounts_or_sending_notifications(): void
    {
        Notification::fake();
        config(['registration.email_delivery_enabled' => false]);
        $this->getJson('/api/v1/auth/options')->assertOk()->assertJsonPath('data.registration_enabled', false)->assertJsonPath('data.email_delivery_enabled', false);
        $this->postJson('/api/v1/auth/register', $this->registration('campus@example.test'))->assertStatus(503);
        $this->assertDatabaseCount('users', 0);
        $u = User::factory()->create();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $u->email])->assertStatus(503);
        $this->actingAs($u)->postJson('/api/v1/auth/email/resend')->assertStatus(503);
        Notification::assertNothingSent();
    }

    public function test_password_change_requires_correct_current_password_and_preserves_unrelated_accounts(): void
    {
        $u = User::factory()->create(['password' => 'OriginalPassword123']);
        $other = User::factory()->create();
        $ownToken = $u->createToken('own', ['campus']);
        $otherToken = $other->createToken('other', ['campus']);
        DB::table('sessions')->insert([
            ['id' => 'own-old-session', 'user_id' => $u->id, 'payload' => '', 'last_activity' => time()],
            ['id' => 'other-session', 'user_id' => $other->id, 'payload' => '', 'last_activity' => time()],
        ]);
        DB::table('password_reset_tokens')->insert(['email' => $u->email, 'token' => 'old-reset', 'created_at' => now()]);
        $payload = ['current_password' => 'WrongPassword123', 'password' => 'ReplacementPassword456', 'password_confirmation' => 'ReplacementPassword456'];
        $this->actingAs($u)->putJson('/api/v1/me/password', $payload)->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $ownToken->accessToken->id]);
        $this->assertTrue(Hash::check('OriginalPassword123', $u->fresh()->password));
        $payload['current_password'] = 'OriginalPassword123';
        $this->putJson('/api/v1/me/password', $payload)->assertNoContent();
        $this->assertTrue(Hash::check('ReplacementPassword456', $u->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $ownToken->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->accessToken->id]);
        $this->assertDatabaseMissing('sessions', ['id' => 'own-old-session']);
        $this->assertDatabaseHas('sessions', ['id' => 'other-session']);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $u->email]);
        $this->assertDatabaseHas('audit_logs', ['subject_id' => $u->id, 'action' => 'password.changed']);
    }

    public function test_password_change_rejects_guests_reuse_and_mismatched_confirmation(): void
    {
        $this->putJson('/api/v1/me/password', [])->assertUnauthorized();
        $u = User::factory()->create(['password' => 'OriginalPassword123']);
        $this->actingAs($u)->putJson('/api/v1/me/password', ['current_password' => 'OriginalPassword123', 'password' => 'OriginalPassword123', 'password_confirmation' => 'OriginalPassword123'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->putJson('/api/v1/me/password', ['current_password' => 'OriginalPassword123', 'password' => 'NewPassword123', 'password_confirmation' => 'MismatchPassword123'])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_native_password_change_revokes_current_and_other_tokens_and_requires_new_password(): void
    {
        $u = User::factory()->create(['password' => 'OriginalPassword123']);
        $token = $u->createToken('native', ['campus'])->plainTextToken;
        $u->createToken('second device', ['campus']);
        $this->withHeader('Authorization', 'Bearer '.$token)->putJson('/api/v1/me/password', ['current_password' => 'OriginalPassword123', 'password' => 'ReplacementPassword456', 'password_confirmation' => 'ReplacementPassword456'])->assertNoContent();
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $u->id]);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/me')->assertUnauthorized();
        $this->withoutHeader('Authorization')->postJson('/api/v1/auth/native/login', ['email' => $u->email, 'password' => 'OriginalPassword123', 'device_name' => 'test'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/native/login', ['email' => $u->email, 'password' => 'ReplacementPassword456', 'device_name' => 'test'])->assertOk();
    }

    public function test_cookie_login_binds_the_session_to_the_password_hash_and_rejects_a_stale_session(): void
    {
        config(['sanctum.stateful' => ['localhost']]);
        $u = User::factory()->create(['password' => 'OriginalPassword123']);
        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'OriginalPassword123'])->assertOk();
        $this->assertNotEmpty(session('password_hash_web'));
        // Simulate a login finishing while another request rotates the password.
        $u->forceFill(['password' => 'ReplacementPassword456'])->save();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Origin', 'http://localhost')->getJson('/api/v1/me')->assertUnauthorized();
    }

    private function registration(string $email): array
    {
        return ['name' => 'Campus User', 'username' => 'campus_user', 'email' => $email, 'password' => 'CampusPassword123', 'password_confirmation' => 'CampusPassword123'];
    }
}
