<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class DailyStreakTest extends TestCase
{
    use RefreshDatabase;

    private function member(): User
    {
        $u = User::factory()->create(['verification_state' => 'approved', 'email_verified_at' => now()]);
        $u->profile()->create([]);
        $u->affiliation()->create(['institution_id' => DB::table('institutions')->value('id')]);

        return $u;
    }

    public function test_days_use_campus_midnight_and_retry_edit_delete_do_not_inflate_streak(): void
    {
        $this->seed(InstitutionSeeder::class);
        $this->travelTo(now()->setTimezone('UTC')->setDate(2026, 10, 17)->setTime(16, 59, 0));
        $u = $this->member();
        $this->actingAs($u)->getJson('/api/v1/me/streak')->assertOk()->assertJsonPath('data.current_days', 0);
        $draft = ['body' => 'Hari pertama', 'visibility' => 'campus', 'client_id' => (string) Str::uuid()];
        $id = $this->postJson('/api/v1/posts', $draft)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/posts', $draft)->assertCreated();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 1)->assertJsonPath('data.completed_today', true)->assertJsonPath('data.timezone', 'Asia/Jakarta');
        $this->travel(2)->minutes();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 1)->assertJsonPath('data.completed_today', false);
        $this->postJson('/api/v1/posts', $draft)->assertCreated();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.completed_today', false);
        $this->patchJson('/api/v1/posts/'.$id, ['body' => 'Edit', 'visibility' => 'campus'])->assertOk();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.completed_today', false);
        $this->postJson('/api/v1/posts', ['body' => 'Balasan', 'parent_id' => $id, 'visibility' => 'campus'])->assertCreated();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 2)->assertJsonPath('data.longest_days', 2);
        $this->deleteJson('/api/v1/posts/'.$id)->assertNoContent();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 2);
        $other = $this->member();
        $this->actingAs($other)->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 0);
        $this->actingAs($u);
        $this->travel(2)->days();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 0)->assertJsonPath('data.longest_days', 2);
        $this->postJson('/api/v1/posts', ['body' => 'Mulai lagi', 'visibility' => 'campus'])->assertCreated();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 1)->assertJsonPath('data.longest_days', 2);
        $this->postJson('/api/v1/posts', ['body' => '', 'visibility' => 'campus'])->assertUnprocessable();
        $this->getJson('/api/v1/me/streak')->assertJsonPath('data.current_days', 1);
    }

    public function test_streak_requires_authentication_and_approved_campus_membership(): void
    {
        $this->getJson('/api/v1/me/streak')->assertUnauthorized();
        $this->actingAs(User::factory()->create(['verification_state' => 'pending']))->getJson('/api/v1/me/streak')->assertForbidden();
        $this->assertDatabaseCount('user_streaks', 0);
    }
}
