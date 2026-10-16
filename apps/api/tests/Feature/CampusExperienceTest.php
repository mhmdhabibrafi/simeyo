<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CampusExperienceTest extends TestCase
{
    public function test_organization_verification_requires_reviewed_owner_and_admin_and_suspension_revokes_tokens(): void
    {
        $owner = $this->member();
        $admin = $this->member('administrator');
        $mod = $this->member('moderator');
        $reporter = $this->member();
        $cid = $this->actingAs($owner)->postJson('/api/v1/communities', ['name' => 'Himpunan', 'description' => 'Organisasi pengujian', 'visibility' => 'campus', 'organization_requested' => true, 'organization_verified' => true])->assertCreated()->assertJsonPath('data.organization_verified', false)->json('data.id');
        $this->actingAs($mod)->patchJson('/api/v1/admin/organizations/'.$cid, ['note' => 'Sudah diperiksa bukti'])->assertForbidden();
        $this->actingAs($admin)->patchJson('/api/v1/admin/organizations/'.$cid, ['note' => 'Sudah diperiksa bukti'])->assertUnprocessable();
        $owner->forceFill(['role' => 'organization_manager'])->save();
        $this->patchJson('/api/v1/admin/organizations/'.$cid, ['note' => 'Afiliasi organisasi diperiksa'])->assertNoContent();
        $this->assertDatabaseHas('communities', ['id' => $cid, 'organization_verified' => true]);
        $post = $this->actingAs($owner)->postJson('/api/v1/posts', ['body' => 'Konten ditinjau', 'visibility' => 'campus'])->assertCreated()->json('data.id');
        $owner->createToken('test-device', ['campus:access']);
        DB::table('sessions')->insert(['id' => 'revocation-test', 'user_id' => $owner->id, 'payload' => 'testing', 'last_activity' => time()]);
        $this->actingAs($reporter)->postJson('/api/v1/posts/'.$post.'/report', ['reason' => 'harassment'])->assertCreated();
        $rid = DB::table('reports')->value('id');
        $this->actingAs($admin)->patchJson('/api/v1/admin/moderation/'.$rid, ['action' => 'suspend', 'note' => 'Penangguhan setelah tinjauan'])->assertNoContent();
        $this->assertDatabaseHas('users', ['id' => $owner->id, 'verification_state' => 'suspended']);
        $this->assertSame(0, $owner->tokens()->count());
        $this->assertDatabaseMissing('sessions', ['id' => 'revocation-test']);
        $this->actingAs($reporter)->getJson('/api/v1/posts/'.$post)->assertNotFound();
        $this->getJson('/api/v1/communities/'.$cid)->assertNotFound();
    }

    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(InstitutionSeeder::class);
    }

    private function member(string $role = 'student'): User
    {
        $u = User::factory()->create(['username' => 'c_'.Str::lower(Str::random(8)), 'verification_state' => 'approved', 'onboarded_at' => now(), 'role' => $role]);
        $u->profile()->create();
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);

        return $u;
    }

    private function community(User $u, string $visibility = 'campus'): int
    {
        return $this->actingAs($u)->postJson('/api/v1/communities', ['name' => 'Ruang riset', 'description' => 'Komunitas penelitian mahasiswa', 'visibility' => $visibility])->assertCreated()->json('data.id');
    }

    public function test_private_communities_require_membership_for_posts_and_manage_roles_safely(): void
    {
        $a = $this->member();
        $b = $this->member();
        $c = $this->member();
        $id = $this->community($a, 'private');
        $post = $this->postJson('/api/v1/posts', ['body' => 'Rahasia komunitas', 'visibility' => 'campus', 'community_id' => $id])->assertCreated()->json('data.id');
        $this->actingAs($b)->getJson('/api/v1/posts/'.$post)->assertNotFound();
        $this->getJson('/api/v1/feed?community_id='.$id)->assertNotFound();
        $this->postJson('/api/v1/posts', ['body' => 'intruder', 'visibility' => 'campus', 'community_id' => $id])->assertNotFound();
        $this->putJson("/api/v1/communities/$id/membership")->assertJsonPath('data.membership.state', 'pending');
        $this->patchJson("/api/v1/communities/$id/members/".$b->id, ['action' => 'promote'])->assertForbidden();
        $this->actingAs($a)->patchJson("/api/v1/communities/$id/members/".$b->id, ['action' => 'accept'])->assertNoContent();
        $this->actingAs($b)->getJson('/api/v1/posts/'.$post)->assertOk();
        $this->getJson('/api/v1/feed?community_id='.$id)->assertJsonCount(1, 'data');
        $this->actingAs($a)->patchJson("/api/v1/communities/$id/members/".$b->id, ['action' => 'promote'])->assertNoContent();
        $this->actingAs($b)->patchJson("/api/v1/communities/$id/members/".$a->id, ['action' => 'remove'])->assertUnprocessable();
        $this->actingAs($c)->putJson("/api/v1/communities/$id/membership")->assertOk();
        $this->actingAs($b)->patchJson("/api/v1/communities/$id/members/".$c->id, ['action' => 'accept'])->assertNoContent();
        $this->patchJson("/api/v1/communities/$id/members/".$c->id, ['action' => 'promote'])->assertForbidden();
        $this->actingAs($a)->deleteJson("/api/v1/communities/$id")->assertNoContent();
        $this->actingAs($b)->getJson('/api/v1/posts/'.$post)->assertNotFound();
    }

    public function test_events_validate_time_ownership_private_community_and_idempotent_rsvp(): void
    {
        $a = $this->member();
        $b = $this->member();
        $data = ['title' => 'Diskusi kampus', 'description' => 'Diskusi terbuka', 'location' => 'Perpustakaan', 'starts_at' => now()->addDay()->toIso8601String(), 'ends_at' => now()->addDays(2)->toIso8601String()];
        $id = $this->actingAs($a)->postJson('/api/v1/events', $data)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/events', array_replace($data, ['ends_at' => now()->toIso8601String()]))->assertUnprocessable();
        $this->actingAs($b)->patchJson('/api/v1/events/'.$id, $data)->assertForbidden();
        $this->putJson("/api/v1/events/$id/rsvp", ['state' => 'going'])->assertJsonPath('data.going_count', 1);
        $this->putJson("/api/v1/events/$id/rsvp", ['state' => 'going'])->assertJsonPath('data.going_count', 1);
        $this->deleteJson("/api/v1/events/$id/rsvp")->assertJsonPath('data.going_count', 0);
        $cid = $this->community($a, 'private');
        $private = $this->postJson('/api/v1/events', $data + ['community_id' => $cid])->assertCreated()->json('data.id');
        $this->actingAs($b)->getJson('/api/v1/events/'.$private)->assertNotFound();
        $this->getJson('/api/v1/events')->assertJsonCount(1, 'data');
        $this->putJson("/api/v1/events/$private/rsvp", ['state' => 'going'])->assertNotFound();
    }

    public function test_mentions_topics_and_search_respect_visibility_and_literal_wildcards(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->actingAs($a)->postJson('/api/v1/posts', ['body' => 'Halo @'.$b->username.' #Riset #riset literal 100%', 'visibility' => 'campus'])->assertCreated()->json('data.id');
        $this->assertSame(1, DB::table('post_hashtags')->count());
        $this->actingAs($b)->getJson('/api/v1/notifications')->assertJsonPath('data.0.kind', 'mentions');
        $this->getJson('/api/v1/pulse')->assertJsonPath('data.topics.0.name', 'riset')->assertJsonPath('data.topics.0.posts_count', 1);
        $this->getJson('/api/v1/search/posts?q=100%25')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/search/posts?q=%25%25')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/search/topics?q=RIS')->assertJsonPath('data.0.name', 'riset')->assertJsonPath('data.0.posts_count', 1);
        $this->getJson('/api/v1/search/topics?q=%25')->assertJsonCount(0, 'data');
        $a->profile->update(['private_account' => true]);
        $this->getJson('/api/v1/pulse')->assertJsonCount(0, 'data.topics');
        $this->getJson('/api/v1/search/posts?q=Riset')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/search/topics?q=riset')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/notifications')->assertJsonCount(0, 'data');
        $this->actingAs($a)->patchJson('/api/v1/posts/'.$p, ['body' => 'Tanpa hashtag', 'visibility' => 'campus'])->assertOk();
        $this->assertSame(0, DB::table('post_hashtags')->count());
    }

    public function test_topic_search_pages_historical_visible_topics_and_excludes_muted_authors(): void
    {
        $a = $this->member();
        $b = $this->member();
        $tags = array_map(fn ($i) => '#topic_'.str_pad((string) $i, 2, '0', STR_PAD_LEFT), range(0, 24));
        foreach (array_chunk($tags, 20) as $chunk) {
            $id = $this->actingAs($a)->postJson('/api/v1/posts', ['body' => implode(' ', $chunk), 'visibility' => 'campus'])->assertCreated()->json('data.id');
            DB::table('posts')->where('id', $id)->update(['created_at' => now()->subDays(3)]);
        }
        $first = $this->actingAs($b)->getJson('/api/v1/search/topics?q=topic')->assertOk()->assertJsonCount(20, 'data');
        $this->assertNotNull($first->json('next_cursor'));
        $second = $this->getJson('/api/v1/search/topics?q=topic&cursor='.urlencode($first->json('next_cursor')))->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('next_cursor', null);
        $this->assertEmpty(array_intersect(array_column($first->json('data'), 'name'), array_column($second->json('data'), 'name')));
        $this->putJson('/api/v1/relationships/'.$a->id.'/mute')->assertNoContent();
        $this->getJson('/api/v1/search/topics?q=topic')->assertJsonCount(0, 'data');
    }

    public function test_moderation_scopes_roles_self_review_and_audit(): void
    {
        $a = $this->member();
        $reporter = $this->member();
        $mod = $this->member('moderator');
        $admin = $this->member('administrator');
        $id = $this->actingAs($a)->postJson('/api/v1/posts', ['body' => 'Diperiksa', 'visibility' => 'campus'])->assertCreated()->json('data.id');
        $this->actingAs($reporter)->postJson('/api/v1/posts/'.$id.'/report', ['reason' => 'spam'])->assertCreated();
        $rid = DB::table('reports')->value('id');
        $this->getJson('/api/v1/admin/moderation')->assertForbidden();
        $this->actingAs($a)->patchJson('/api/v1/admin/moderation/'.$rid, ['action' => 'remove', 'note' => 'Catatan peninjauan'])->assertForbidden();
        $this->actingAs($mod)->getJson('/api/v1/admin/moderation')->assertJsonPath('stats.pending_reports', 1);
        $this->patchJson('/api/v1/admin/moderation/'.$rid, ['action' => 'suspend', 'note' => 'Catatan peninjauan'])->assertForbidden();
        $this->patchJson('/api/v1/admin/moderation/'.$rid, ['action' => 'remove', 'note' => 'Konten spam terkonfirmasi'])->assertNoContent();
        $this->assertSoftDeleted('posts', ['id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'moderation.remove', 'subject_id' => $a->id]);
        $this->patchJson('/api/v1/admin/moderation/'.$rid, ['action' => 'dismiss', 'note' => 'Sudah diproses sebelumnya'])->assertConflict();
        $other = Institution::create(['name' => 'Other', 'slug' => 'other']);
        $admin->affiliation->update(['institution_id' => $other->id]);
        $this->actingAs($admin)->getJson('/api/v1/admin/moderation')->assertJsonCount(0, 'data');
        $this->patchJson('/api/v1/admin/moderation/'.$rid, ['action' => 'dismiss', 'note' => 'Tidak dalam kampus ini'])->assertNotFound();
    }
}
