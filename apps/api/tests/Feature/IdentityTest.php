<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use App\Models\VerificationRequest;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class IdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->seed(InstitutionSeeder::class);
    }

    private function user(array $attributes = []): User
    {
        $u = User::factory()->create($attributes);
        $u->forceFill(['username' => 'user_'.$u->id])->save();
        $u->profile()->create([]);
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);

        return $u;
    }

    private function approved(array $attributes = []): User
    {
        $u = $this->user($attributes);
        $u->forceFill(['verification_state' => 'approved', 'email_verified_at' => now(), 'onboarded_at' => now()])->save();

        return $u;
    }

    private function requestFor(User $u): VerificationRequest
    {
        return VerificationRequest::create(['user_id' => $u->id, 'requested_affiliation' => 'lecturer', 'method' => 'manual', 'state' => 'pending', 'statement' => 'Saya mengajar di kampus ini dan mengajukan verifikasi.']);
    }

    public function test_registration_hashes_password_and_ignores_privilege_fields(): void
    {
        $this->postJson('/api/v1/auth/register', ['name' => 'Nadia', 'username' => 'nadia', 'email' => 'NADIA@example.test', 'password' => 'SecurePassword123', 'password_confirmation' => 'SecurePassword123', 'role' => 'super_administrator', 'verification_state' => 'approved'])->assertCreated()->assertJsonPath('data.verification_state', 'pending');
        $u = User::where('username', 'nadia')->firstOrFail();
        $this->assertSame('student', $u->role);
        $this->assertSame('nadia@example.test', $u->email);
        $this->assertTrue(Hash::check('SecurePassword123', $u->password));
        Notification::assertSentTo($u, VerifyEmail::class);
        $this->assertDatabaseHas('user_profiles', ['user_id' => $u->id]);
    }

    public function test_registration_rejects_weak_password_and_duplicate_username(): void
    {
        $u = $this->user();
        $this->postJson('/api/v1/auth/register', ['name' => 'Nadia', 'username' => $u->username, 'email' => 'other@example.test', 'password' => 'short', 'password_confirmation' => 'short'])->assertUnprocessable()->assertJsonValidationErrors(['username', 'password']);
    }

    public function test_credentials_and_logout(): void
    {
        $u = $this->user(['password' => 'SecurePassword123']);
        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'SecurePassword123'])->assertOk()->assertJsonPath('data.id', $u->id);
        $this->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_unverified_or_suspended_users_cannot_access_campus(): void
    {
        foreach (['pending', 'rejected', 'suspended'] as $state) {
            $u = $this->user();
            $u->forceFill(['verification_state' => $state])->save();
            $this->actingAs($u)->getJson('/api/v1/campus')->assertForbidden();
        }
        $u = $this->approved();
        $u->forceFill(['email_verified_at' => null])->save();
        $this->actingAs($u)->getJson('/api/v1/campus')->assertForbidden();
    }

    public function test_approved_user_can_access_campus(): void
    {
        $this->actingAs($this->approved())->getJson('/api/v1/campus')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_email_verification_checks_user_hash_and_signature(): void
    {
        $u = $this->user(['email_verified_at' => null]);
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), ['id' => $u->id, 'hash' => sha1($u->email)]);
        $this->actingAs($u)->get($url)->assertRedirect();
        $this->assertNotNull($u->fresh()->email_verified_at);
        $other = $this->user(['email_verified_at' => null]);
        $this->actingAs($other)->get($url)->assertForbidden();
        $bad = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), ['id' => $other->id, 'hash' => 'invalid']);
        $this->get($bad)->assertForbidden();
    }

    public function test_expired_email_verification_is_rejected(): void
    {
        $u = $this->user(['email_verified_at' => null]);
        $url = URL::temporarySignedRoute('verification.verify', now()->subMinutes(1), ['id' => $u->id, 'hash' => sha1($u->email)]);
        $this->actingAs($u)->get($url)->assertForbidden();
    }

    public function test_onboarding_rejects_cross_institution_academic_data(): void
    {
        $u = $this->user();
        $i = Institution::create(['name' => 'Other', 'slug' => 'other']);
        $faculty = DB::table('faculties')->value('id');
        $this->actingAs($u)->postJson('/api/v1/onboarding', ['institution_id' => $i->id, 'faculty_id' => $faculty])->assertUnprocessable()->assertJsonValidationErrors('faculty_id');
    }

    public function test_onboarding_and_manual_verification_persist(): void
    {
        $u = $this->user();
        $this->actingAs($u)->postJson('/api/v1/onboarding', ['institution_id' => Institution::first()->id])->assertOk();
        for ($i = 0; $i < 5; $i++) {
            $this->getJson('/api/v1/me')->assertOk();
        }
        $this->postJson('/api/v1/verification', ['requested_affiliation' => 'lecturer', 'method' => 'manual', 'statement' => 'Saya adalah dosen kampus ini, mohon tinjau afiliasi saya.'])->assertCreated()->assertJsonPath('data.state', 'pending');
        $this->assertDatabaseHas('verification_requests', ['user_id' => $u->id, 'state' => 'pending']);
        $this->assertSame('student', $u->fresh()->role);
        $this->postJson('/api/v1/onboarding', ['institution_id' => Institution::first()->id])->assertConflict();
    }

    public function test_unconfigured_institutional_email_cannot_auto_approve(): void
    {
        $u = $this->user();
        $u->forceFill(['onboarded_at' => now()])->save();
        $this->actingAs($u)->postJson('/api/v1/verification', ['requested_affiliation' => 'student', 'method' => 'institutional_email', 'statement' => 'Email institusi saya telah terverifikasi.'])->assertUnprocessable();
    }

    public function test_configured_email_can_approve_students_only(): void
    {
        Institution::first()->update(['email_auto_approval' => true, 'email_domains' => ['campus.example.test']]);
        $u = $this->user(['email' => 'nadia@campus.example.test']);
        $u->forceFill(['onboarded_at' => now()])->save();
        $this->actingAs($u)->postJson('/api/v1/verification', ['requested_affiliation' => 'student', 'method' => 'institutional_email', 'statement' => 'Email institusi saya telah terverifikasi.'])->assertCreated()->assertJsonPath('data.state', 'approved');
        $lecturer = $this->user(['email' => 'dosen@campus.example.test']);
        $lecturer->forceFill(['onboarded_at' => now()])->save();
        $this->actingAs($lecturer)->postJson('/api/v1/verification', ['requested_affiliation' => 'lecturer', 'method' => 'institutional_email', 'statement' => 'Email institusi saya telah terverifikasi.'])->assertUnprocessable();
    }

    public function test_student_cannot_review_or_self_assign_roles(): void
    {
        $u = $this->approved();
        $v = $this->requestFor($this->user());
        $this->actingAs($u)->getJson('/api/v1/admin/verifications')->assertForbidden();
        $this->patchJson('/api/v1/admin/verifications/'.$v->id, ['state' => 'approved', 'review_note' => 'Sudah ditinjau.'])->assertForbidden();
        $this->patchJson('/api/v1/me', ['name' => 'Updated', 'role' => 'administrator', 'verification_state' => 'approved'])->assertOk();
        $this->assertSame('student', $u->fresh()->role);
    }

    public function test_administrator_review_updates_role_and_audits_transaction(): void
    {
        $admin = $this->approved(['role' => 'administrator']);
        $target = $this->user();
        $v = $this->requestFor($target);
        $this->actingAs($admin)->patchJson('/api/v1/admin/verifications/'.$v->id, ['state' => 'approved', 'review_note' => 'Afiliasi dikonfirmasi secara manual.'])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => 'lecturer', 'verification_state' => 'approved']);
        $this->assertDatabaseHas('audit_logs', ['actor_id' => $admin->id, 'subject_id' => $target->id, 'action' => 'verification.approved']);
        $this->patchJson('/api/v1/admin/verifications/'.$v->id, ['state' => 'approved', 'review_note' => 'Keputusan kedua tidak boleh diproses.'])->assertConflict();
    }

    public function test_admin_cannot_review_self_or_approve_unverified_email(): void
    {
        $admin = $this->approved(['role' => 'administrator']);
        $v = $this->requestFor($admin);
        $this->actingAs($admin)->patchJson('/api/v1/admin/verifications/'.$v->id, ['state' => 'approved', 'review_note' => 'Review akun sendiri.'])->assertForbidden();
        $u = $this->user(['email_verified_at' => null]);
        $v = $this->requestFor($u);
        $this->patchJson('/api/v1/admin/verifications/'.$v->id, ['state' => 'approved', 'review_note' => 'Email belum terverifikasi.'])->assertUnprocessable();
    }

    public function test_profile_resource_hides_email_and_academic_information(): void
    {
        $viewer = $this->approved();
        $target = $this->approved();
        $faculty = DB::table('faculties')->first();
        $target->affiliation()->update(['faculty_id' => $faculty->id]);
        $this->actingAs($viewer)->getJson('/api/v1/profiles/'.$target->username)->assertOk()->assertJsonPath('data.faculty', null)->assertJsonMissingPath('data.email')->assertJsonMissingPath('data.role')->assertJsonMissingPath('data.verification_state');
        $target->profile()->update(['academic_visible' => true]);
        $this->getJson('/api/v1/profiles/'.$target->username)->assertJsonPath('data.faculty', $faculty->name);
    }

    public function test_profiles_are_scoped_to_institution(): void
    {
        $u = $this->approved();
        $target = $this->approved();
        $i = Institution::create(['name' => 'Other', 'slug' => 'other']);
        $target->affiliation()->update(['institution_id' => $i->id]);
        $this->actingAs($u)->getJson('/api/v1/profiles/'.$target->username)->assertNotFound();
    }

    public function test_profile_rejects_unsafe_links_and_persists_preferences(): void
    {
        $u = $this->user();
        $this->actingAs($u)->patchJson('/api/v1/me', ['links' => ['javascript:alert(1)']])->assertUnprocessable();
        $this->patchJson('/api/v1/me', ['bio' => 'Halo kampus!', 'interests' => ['Teknologi'], 'academic_visible' => true, 'private_account' => true])->assertOk()->assertJsonPath('data.bio', 'Halo kampus!')->assertJsonPath('data.private_account', true);
        $this->assertDatabaseHas('user_profiles', ['user_id' => $u->id, 'bio' => 'Halo kampus!']);
    }

    public function test_media_validation_reencoding_and_access(): void
    {
        Storage::fake('local');
        $u = $this->approved();
        $this->actingAs($u)->postJson('/api/v1/me/media', ['kind' => 'avatar', 'image' => UploadedFile::fake()->create('malware.svg', 10, 'image/svg+xml')])->assertUnprocessable();
        $response = $this->postJson('/api/v1/me/media', ['kind' => 'avatar', 'image' => UploadedFile::fake()->image('photo.png', 900, 900)])->assertOk();
        $url = $response->json('data.url');
        $path = substr($url, strlen('/media/'));
        Storage::disk('local')->assertExists($path);
        $this->get($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $pending = $this->user();
        $this->actingAs($pending)->get($url)->assertForbidden();
    }

    public function test_password_reset_revokes_tokens_and_sessions(): void
    {
        $u = $this->user();
        $token = Password::createToken($u);
        $u->createToken('phone', ['campus']);
        DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $u->id, 'payload' => '', 'last_activity' => time()]);
        $this->postJson('/api/v1/auth/reset-password', ['email' => $u->email, 'token' => $token, 'password' => 'NewSecurePassword123', 'password_confirmation' => 'NewSecurePassword123'])->assertOk();
        $this->assertTrue(Hash::check('NewSecurePassword123', $u->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'old-session']);
        $this->assertSame(0, $u->tokens()->count());
    }

    public function test_password_recovery_does_not_reveal_account_presence(): void
    {
        $u = $this->user();
        $a = $this->postJson('/api/v1/auth/forgot-password', ['email' => $u->email])->assertOk()->json();
        $b = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test'])->assertOk()->json();
        $this->assertSame($a, $b);
    }

    public function test_native_login_issues_expiring_scoped_token_and_revokes_it(): void
    {
        $u = $this->approved(['password' => 'SecurePassword123']);
        $r = $this->postJson('/api/v1/auth/native/login', ['email' => $u->email, 'password' => 'SecurePassword123', 'device_name' => 'Test phone'])->assertOk();
        $token = $r->json('data.token');
        $this->assertSame(['campus'], $u->tokens()->first()->abilities);
        $this->assertNotNull($u->tokens()->first()->expires_at);
        $this->withToken($token)->getJson('/api/v1/me')->assertOk();
        $this->withToken($token)->postJson('/api/v1/auth/native/logout')->assertNoContent();
        $this->assertSame(0, $u->tokens()->count());
    }

    public function test_foreign_session_cannot_be_revoked(): void
    {
        $a = $this->user();
        $b = $this->user();
        DB::table('sessions')->insert(['id' => 'foreign', 'user_id' => $b->id, 'payload' => '', 'last_activity' => time()]);
        $this->actingAs($a)->deleteJson('/api/v1/auth/sessions/foreign')->assertNoContent();
        $this->assertDatabaseHas('sessions', ['id' => 'foreign']);
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'invalid@example.test', 'password' => 'bad'])->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'invalid@example.test', 'password' => 'bad'])->assertStatus(429);
    }
}
