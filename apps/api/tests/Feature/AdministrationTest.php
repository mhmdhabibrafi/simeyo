<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use App\Models\VerificationRequest;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdministrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_review_is_institution_scoped(): void
    {
        $this->seed(InstitutionSeeder::class);
        $a = User::factory()->create(['role' => 'administrator', 'verification_state' => 'approved']);
        $a->affiliation()->create(['institution_id' => Institution::first()->id]);
        $i = Institution::create(['name' => 'Other campus', 'slug' => 'other']);
        $u = User::factory()->create();
        $u->affiliation()->create(['institution_id' => $i->id]);
        $v = VerificationRequest::create(['user_id' => $u->id, 'requested_affiliation' => 'student', 'state' => 'pending', 'method' => 'manual', 'statement' => 'Synthetic affiliation statement.']);
        $this->actingAs($a)->getJson('/api/v1/admin/verifications')->assertOk()->assertJsonCount(0, 'data');
        $this->patchJson('/api/v1/admin/verifications/'.$v->id, ['state' => 'approved', 'review_note' => 'Cross campus attempt rejected.'])->assertForbidden();
    }

    public function test_cli_bootstrap_requires_review_and_verified_onboarding(): void
    {
        $this->seed(InstitutionSeeder::class);
        $u = User::factory()->create(['onboarded_at' => now()]);
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);
        $this->artisan('ruang:grant-admin', ['email' => $u->email])->assertFailed();
        $this->artisan('ruang:grant-admin', ['email' => $u->email, '--confirm-reviewed' => true])->assertSuccessful();
        $this->assertDatabaseHas('users', ['id' => $u->id, 'role' => 'administrator', 'verification_state' => 'approved']);
        $this->assertDatabaseHas('audit_logs', ['subject_id' => $u->id, 'action' => 'administrator.granted-cli']);
    }

    public function test_native_tokens_without_campus_ability_are_rejected(): void
    {
        $this->seed(InstitutionSeeder::class);
        $u = User::factory()->create(['verification_state' => 'approved']);
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);
        $token = $u->createToken('invalid-scope', ['profile'])->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/campus')->assertForbidden();
    }

    public function test_verified_affiliation_cannot_be_swapped_without_review(): void
    {
        $this->seed(InstitutionSeeder::class);
        $u = User::factory()->create(['verification_state' => 'approved', 'onboarded_at' => now()]);
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);
        $i = Institution::create(['name' => 'Other campus', 'slug' => 'other']);
        $this->actingAs($u)->postJson('/api/v1/onboarding', ['institution_id' => $i->id])->assertConflict();
        $this->assertDatabaseHas('user_affiliations', ['user_id' => $u->id, 'institution_id' => Institution::first()->id]);
    }

    public function test_expired_native_token_is_not_authenticated(): void
    {
        $u = User::factory()->create();
        $token = $u->createToken('expired', ['campus'], now()->subMinute())->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }
}
