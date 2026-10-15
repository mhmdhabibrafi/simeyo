<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\InstitutionSeeder;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FirebaseAuthTest extends TestCase
{
    use RefreshDatabase;

    private mixed $key;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        config(['firebase.enabled' => true, 'firebase.project_id' => 'simeyo']);
        $this->seed(InstitutionSeeder::class);
        $this->key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        Http::fake(['www.googleapis.com/*' => Http::response(['test-key' => openssl_pkey_get_details($this->key)['key']])]);
    }

    private function token(array $changes = []): string
    {
        openssl_pkey_export($this->key, $private);

        return JWT::encode(array_replace(['sub' => 'campus-google-user', 'aud' => 'simeyo', 'iss' => 'https://securetoken.google.com/simeyo', 'iat' => time(), 'exp' => time() + 3600, 'auth_time' => time(), 'email' => 'student@students.uin-suska.ac.id', 'email_verified' => true, 'firebase' => ['sign_in_provider' => 'google.com']], $changes), $private, 'RS256', 'test-key');
    }

    public function test_google_campus_identity_creates_verified_session_without_admin_rights(): void
    {
        $this->postJson('/api/v1/auth/firebase', ['firebase_token' => $this->token()])->assertOk()->assertJsonPath('data.verified', true)->assertJsonPath('data.email_verified', true)->assertJsonPath('data.can_review_verifications', false);
        $this->assertDatabaseHas('firebase_identities', ['campus_category' => 'student']);
        $this->assertAuthenticated();
    }

    public function test_root_domain_is_staff_metadata_without_admin_privileges(): void
    {
        $this->postJson('/api/v1/auth/firebase', ['firebase_token' => $this->token(['email' => 'staff@uin-suska.ac.id'])])->assertOk()->assertJsonPath('data.can_review_verifications', false);
        $this->assertDatabaseHas('firebase_identities', ['campus_category' => 'staff']);
    }

    public function test_untrusted_claims_never_create_a_verified_user(): void
    {
        foreach ([['email' => 'student@students.uin-suska.ac.id.evil.test'], ['email_verified' => false], ['aud' => 'other-project'], ['iss' => 'https://evil.test'], ['exp' => time() - 60], ['auth_time' => time() - 600], ['firebase' => ['sign_in_provider' => 'password']]] as $claims) {
            $this->postJson('/api/v1/auth/firebase', ['firebase_token' => $this->token($claims)])->assertUnprocessable();
        }
        $this->assertDatabaseCount('users', 0);
    }

    public function test_google_does_not_restore_suspended_accounts(): void
    {
        $user = User::factory()->create(['email' => 'student@students.uin-suska.ac.id', 'verification_state' => 'suspended']);
        $this->postJson('/api/v1/auth/firebase', ['firebase_token' => $this->token()])->assertForbidden();
        $this->assertSame('suspended', $user->fresh()->verification_state);
    }

    public function test_forged_signature_and_disabled_provider_do_not_authenticate(): void
    {
        $token = $this->token();
        $parts = explode('.', $token);
        $parts[2] = JWT::urlsafeB64Encode(str_repeat('x', 256));
        $this->postJson('/api/v1/auth/firebase', ['firebase_token' => implode('.', $parts)])->assertUnprocessable();
        config(['firebase.enabled' => false]);
        $this->postJson('/api/v1/auth/firebase', ['firebase_token' => $token])->assertStatus(503);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_google_ownership_invalidates_credentials_of_unverified_preregistered_account(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'student@students.uin-suska.ac.id']);
        $old = $user->password;
        $user->tokens()->create(['name' => 'untrusted', 'token' => hash('sha256', 'untrusted'), 'abilities' => ['campus']]);
        $this->postJson('/api/v1/auth/firebase', ['firebase_token' => $this->token()])->assertOk();
        $this->assertNotSame($old, $user->fresh()->password);
        $this->assertSame(0, $user->tokens()->count());
    }
}
