<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use App\Services\CampusActivity;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CommunicationsTest extends TestCase
{
    public function test_message_search_is_private_literal_paginated_and_does_not_mark_read(): void
    {
        $a = $this->member();
        $b = $this->member();
        $outsider = $this->member();
        $id = $this->start($a, $b);
        for ($i = 0; $i < 31; $i++) {
            Message::create(['conversation_id' => $id, 'sender_id' => $b->id, 'client_id' => (string) Str::uuid(), 'body' => 'Rapat%_ '.$i]);
        }
        $first = $this->actingAs($a)->getJson('/api/v1/conversations/'.$id.'/messages?q=%25')->assertOk()->assertJsonCount(30, 'data');
        $next = $this->getJson('/api/v1/conversations/'.$id.'/messages?q=%25&cursor='.urlencode($first->json('next_cursor')))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('next_cursor', null);
        $this->assertEmpty(array_intersect(array_column($first->json('data'), 'id'), array_column($next->json('data'), 'id')));
        $this->getJson('/api/v1/conversations/'.$id.'/messages?q=TidakAda')->assertOk()->assertJsonCount(0, 'data');
        $this->assertSame(0, (int) DB::table('conversation_participants')->where('conversation_id', $id)->where('user_id', $a->id)->value('last_read_message_id'));
        $this->actingAs($outsider)->getJson('/api/v1/conversations/'.$id.'/messages?q=Rapat')->assertNotFound();
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/block')->assertNoContent();
        $this->actingAs($a)->getJson('/api/v1/conversations/'.$id.'/messages?q=Rapat')->assertNotFound();
    }

    public function test_conversation_reports_limit_evidence_and_require_scoped_independent_review(): void
    {
        $a = $this->member();
        $b = $this->member();
        $other = $this->member();
        $id = $this->start($a, $b);
        foreach ([[$b, 'Pesan lama tidak dilampirkan'], [$a, 'Pesan pelapor tidak dilampirkan'], [$b, 'Pesan bukti terbaru']] as [$sender, $body]) {
            Message::create(['conversation_id' => $id, 'sender_id' => $sender->id, 'client_id' => (string) Str::uuid(), 'body' => $body]);
        }
        $this->actingAs($other)->postJson('/api/v1/conversations/'.$id.'/report', ['reason' => 'spam'])->assertNotFound();
        $this->actingAs($a)->postJson('/api/v1/conversations/'.$id.'/report', ['reason' => 'harassment', 'details' => 'Mohon tinjau pesan ini.'])->assertCreated();
        $this->postJson('/api/v1/conversations/'.$id.'/report', ['reason' => 'harassment'])->assertCreated();
        $this->assertSame(1, DB::table('conversation_reports')->count());
        $report = DB::table('conversation_reports')->first();
        $this->assertSame('Pesan bukti terbaru', $report->body);
        $ownMessage = Message::where('conversation_id', $id)->where('sender_id', $a->id)->value('id');
        $this->postJson('/api/v1/conversations/'.$id.'/report', ['reason' => 'spam', 'message_id' => $ownMessage])->assertNotFound();
        $this->getJson('/api/v1/admin/message-reports')->assertForbidden();
        $a->forceFill(['role' => 'moderator'])->save();
        $this->actingAs($a)->patchJson('/api/v1/admin/message-reports/'.$report->id, ['action' => 'dismiss', 'note' => 'Tinjauan laporan sendiri.'])->assertForbidden();
        $foreign = $this->member();
        $foreign->forceFill(['role' => 'moderator'])->save();
        $institution = Institution::create(['name' => 'Kampus pengujian lain', 'slug' => 'other-test']);
        $foreign->affiliation->update(['institution_id' => $institution->id]);
        $this->actingAs($foreign)->getJson('/api/v1/admin/message-reports')->assertOk()->assertJsonCount(0, 'data');
        $this->patchJson('/api/v1/admin/message-reports/'.$report->id, ['action' => 'warn', 'note' => 'Tinjauan lintas kampus.'])->assertNotFound();
        $other->forceFill(['role' => 'moderator'])->save();
        $list = $this->actingAs($other)->getJson('/api/v1/admin/message-reports')->assertOk()->assertJsonPath('data.0.body', 'Pesan bukti terbaru');
        $this->assertStringNotContainsString('Pesan pelapor tidak dilampirkan', $list->getContent());
        $this->patchJson('/api/v1/admin/message-reports/'.$report->id, ['action' => 'suspend', 'note' => 'Memerlukan administrator.'])->assertForbidden();
        $b->affiliation->update(['institution_id' => $institution->id]);
        $this->patchJson('/api/v1/admin/message-reports/'.$report->id, ['action' => 'warn', 'note' => 'Peringatan lintas kampus.'])->assertForbidden();
        $b->affiliation->update(['institution_id' => $a->affiliation->institution_id]);
        $this->patchJson('/api/v1/admin/message-reports/'.$report->id, ['action' => 'warn', 'note' => 'Peringatan karena pelecehan.'])->assertNoContent();
        $this->assertDatabaseHas('audit_logs', ['action' => 'moderation.message.warn', 'subject_id' => $b->id]);
        $this->patchJson('/api/v1/admin/message-reports/'.$report->id, ['action' => 'dismiss', 'note' => 'Tidak boleh tinjau ulang.'])->assertConflict();
        $oldMessage = Message::where('conversation_id', $id)->where('sender_id', $b->id)->orderBy('id')->value('id');
        $this->actingAs($a)->postJson('/api/v1/conversations/'.$id.'/report', ['reason' => 'spam', 'message_id' => $oldMessage])->assertCreated();
        $this->assertDatabaseHas('conversation_reports', ['message_id' => $oldMessage, 'body' => 'Pesan lama tidak dilampirkan']);
    }

    public function test_message_report_suspension_revokes_sessions_and_tokens_but_protects_staff_roles(): void
    {
        $a = $this->member();
        $b = $this->member();
        $admin = $this->member();
        $admin->forceFill(['role' => 'administrator'])->save();
        $b->forceFill(['role' => 'moderator'])->save();
        $id = $this->start($a, $b);
        $this->actingAs($a)->postJson('/api/v1/conversations/'.$id.'/report', ['reason' => 'spam'])->assertCreated();
        $reportId = DB::table('conversation_reports')->value('id');
        $this->actingAs($admin)->patchJson('/api/v1/admin/message-reports/'.$reportId, ['action' => 'suspend', 'note' => 'Tinjauan administrator.'])->assertForbidden();
        $b->forceFill(['role' => 'student'])->save();
        $b->createToken('isolated-report-test', ['campus']);
        DB::table('sessions')->insert(['id' => Str::random(40), 'user_id' => $b->id, 'payload' => 'isolated-fixture', 'last_activity' => time()]);
        $this->patchJson('/api/v1/admin/message-reports/'.$reportId, ['action' => 'suspend', 'note' => 'Tinjauan administrator.'])->assertNoContent();
        $this->assertSame('suspended', $b->fresh()->verification_state);
        $this->assertSame(0, $b->tokens()->count());
        $this->assertSame(0, DB::table('sessions')->where('user_id', $b->id)->count());
    }

    public function test_message_recipient_discovery_includes_existing_connections_without_changing_suggestions(): void
    {
        $a = $this->member();
        $following = $this->member();
        $follower = $this->member();
        $blocked = $this->member();
        $this->actingAs($a)->putJson('/api/v1/relationships/'.$following->id.'/follow')->assertOk();
        $this->actingAs($follower)->putJson('/api/v1/relationships/'.$a->id.'/follow')->assertOk();
        $this->actingAs($blocked)->putJson('/api/v1/relationships/'.$a->id.'/block')->assertNoContent();
        $result = $this->actingAs($a)->getJson('/api/v1/people?context=messages')->assertOk();
        $ids = array_column($result->json('data'), 'id');
        $this->assertContains($following->id, $ids);
        $this->assertContains($follower->id, $ids);
        $this->assertNotContains($a->id, $ids);
        $this->assertNotContains($blocked->id, $ids);
        $suggestions = $this->getJson('/api/v1/people')->assertOk();
        $this->assertNotContains($following->id, array_column($suggestions->json('data'), 'id'));
        $this->getJson('/api/v1/people?context=messages&q='.$following->username)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $following->id);
    }

    public function test_message_recipient_discovery_paginates_without_repeating_users(): void
    {
        $viewer = $this->member();
        for ($i = 0; $i < 22; $i++) {
            $this->member();
        }
        $first = $this->actingAs($viewer)->getJson('/api/v1/people?context=messages')->assertOk()->assertJsonCount(20, 'data');
        $next = $this->getJson('/api/v1/people?context=messages&cursor='.urlencode($first->json('meta.next_cursor')))->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.next_cursor', null);
        $this->assertEmpty(array_intersect(array_column($first->json('data'), 'id'), array_column($next->json('data'), 'id')));
    }

    public function test_activity_reports_current_incoming_follow_state(): void
    {
        $a = $this->member();
        $b = $this->member();
        $a->profile->update(['private_account' => true]);
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/follow')->assertOk();
        $this->actingAs($a)->getJson('/api/v1/notifications')->assertJsonPath('data.0.follow_state', 'pending');
        DB::table('follows')->where('follower_id', $b->id)->where('followed_id', $a->id)->update(['state' => 'accepted']);
        $this->getJson('/api/v1/notifications')->assertJsonPath('data.0.follow_state', 'accepted');
    }

    public function test_read_receipts_are_scoped_monotonic_and_leave_unseen_messages_unread(): void
    {
        $a = $this->member();
        $b = $this->member();
        $id = $this->start($a, $b);
        $first = $this->actingAs($a)->postJson("/api/v1/conversations/$id/messages", ['body' => 'Pertama', 'client_id' => (string) Str::uuid()])->assertCreated()->json('data.id');
        $second = $this->postJson("/api/v1/conversations/$id/messages", ['body' => 'Kedua', 'client_id' => (string) Str::uuid()])->assertCreated()->json('data.id');
        $this->getJson("/api/v1/conversations/$id/messages")->assertJsonPath('recipient_read_message_id', 0);
        $this->actingAs($b)->putJson("/api/v1/conversations/$id/read", ['message_id' => $first])->assertNoContent();
        $this->getJson('/api/v1/conversations')->assertJsonPath('data.0.unread_count', 1);
        $this->actingAs($a)->getJson("/api/v1/conversations/$id/messages")->assertJsonPath('recipient_read_message_id', $first);
        $this->actingAs($b)->putJson("/api/v1/conversations/$id/read", ['message_id' => $second])->assertNoContent();
        $this->putJson("/api/v1/conversations/$id/read", ['message_id' => $first])->assertNoContent();
        $this->actingAs($a)->getJson("/api/v1/conversations/$id/messages")->assertJsonPath('recipient_read_message_id', $second);
        $this->actingAs($b)->putJson("/api/v1/conversations/$id/read", ['message_id' => 999999])->assertNotFound();
    }

    public function test_batch_activity_read_updates_only_visible_owned_ids(): void
    {
        $a = $this->member();
        $b = $this->member();
        $actor = $this->member();
        app(CampusActivity::class)->send($a, $actor, 'follows');
        app(CampusActivity::class)->send($b, $actor, 'follows');
        $mine = $a->notifications()->first()->id;
        $other = $b->notifications()->first()->id;
        $this->actingAs($a)->putJson('/api/v1/notifications/read', ['ids' => [$mine, $other]])->assertNoContent();
        $this->assertNotNull($a->notifications()->first()->read_at);
        $this->assertNull($b->notifications()->first()->read_at);
        $this->putJson('/api/v1/notifications/read', ['ids' => ['invalid']])->assertUnprocessable();
        $this->putJson('/api/v1/notifications/read', ['ids' => []])->assertUnprocessable();
    }

    public function test_native_login_token_reads_activity_using_the_existing_campus_ability(): void
    {
        $a = $this->member();
        $b = $this->member();
        $a->forceFill(['password' => 'Native-Password-9x'])->save();
        app(CampusActivity::class)->send($a, $b, 'follows');
        $token = $this->postJson('/api/v1/auth/native/login', ['email' => $a->email, 'password' => 'Native-Password-9x', 'device_name' => 'API integration test'])->assertOk()->json('data.token');
        $this->withToken($token)->getJson('/api/v1/notifications')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('unread_count', 1);
        $this->withToken($token)->getJson('/api/v1/feed')->assertOk();
    }

    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(InstitutionSeeder::class);
        config(['broadcasting.default' => 'null']);
    }

    private function member(string $policy = 'campus'): User
    {
        $u = User::factory()->create(['username' => 'm_'.Str::lower(Str::random(8)), 'verification_state' => 'approved', 'onboarded_at' => now()]);
        $u->profile()->create(['dm_policy' => $policy]);
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);

        return $u;
    }

    private function start(User $a, User $b): int
    {
        return $this->actingAs($a)->postJson('/api/v1/conversations', ['user_id' => $b->id])->assertCreated()->json('data.id');
    }

    public function test_messaging_persists_idempotent_retry_and_authorizes_membership(): void
    {
        $a = $this->member();
        $b = $this->member();
        $c = $this->member();
        $id = $this->start($a, $b);
        $this->assertSame($id, $this->start($b, $a));
        $data = ['body' => 'Pesan nyata <script>alert(1)</script>', 'client_id' => (string) Str::uuid()];
        $mid = $this->actingAs($a)->postJson("/api/v1/conversations/$id/messages", $data)->assertCreated()->json('data.id');
        $this->postJson("/api/v1/conversations/$id/messages", $data)->assertCreated()->assertJsonPath('data.id', $mid);
        $this->postJson("/api/v1/conversations/$id/messages", ['body' => 'changed', 'client_id' => $data['client_id']])->assertConflict();
        $this->assertSame(1, Message::count());
        $this->actingAs($b)->getJson("/api/v1/conversations/$id/messages")->assertOk()->assertJsonPath('data.0.body', $data['body']);
        $this->getJson('/api/v1/conversations')->assertJsonPath('data.0.unread_count', 1);
        $this->putJson("/api/v1/conversations/$id/read", ['last_read_message_id' => 999999])->assertNoContent();
        $this->getJson('/api/v1/conversations')->assertJsonPath('data.0.unread_count', 0);
        $this->actingAs($c)->getJson("/api/v1/conversations/$id/messages")->assertNotFound();
        $this->putJson("/api/v1/conversations/$id/read")->assertNotFound();
        $this->postJson("/api/v1/conversations/$id/messages", ['body' => 'intruder', 'client_id' => (string) Str::uuid()])->assertNotFound();
    }

    public function test_recipient_policies_and_blocks_apply_to_existing_conversations(): void
    {
        $a = $this->member();
        $b = $this->member('followers');
        $this->actingAs($a)->postJson('/api/v1/conversations', ['user_id' => $b->id])->assertForbidden();
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/follow')->assertOk();
        $id = $this->start($a, $b);
        $b->profile->update(['dm_policy' => 'nobody']);
        $this->postJson("/api/v1/conversations/$id/messages", ['body' => 'no', 'client_id' => (string) Str::uuid()])->assertForbidden();
        $this->getJson("/api/v1/conversations/$id/messages")->assertOk()->assertJsonPath('can_send', false);
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/block')->assertNoContent();
        foreach ([$a, $b] as $u) {
            $this->actingAs($u)->getJson("/api/v1/conversations/$id/messages")->assertNotFound();
            $this->getJson('/api/v1/conversations')->assertJsonCount(0, 'data');
        }
    }

    public function test_inbox_batches_latest_message_previews_and_keeps_them_private(): void
    {
        $a = $this->member();
        $b = $this->member();
        $id = $this->start($a, $b);
        $this->getJson('/api/v1/conversations')->assertJsonPath('data.0.last_message', null);
        foreach (['Older message', 'Latest preview'] as $body) {
            Message::create(['conversation_id' => $id, 'sender_id' => $b->id, 'body' => $body, 'client_id' => (string) Str::uuid()]);
        }
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->actingAs($a)->getJson('/api/v1/conversations')->assertOk()
            ->assertJsonPath('data.0.last_message.body', 'Latest preview')
            ->assertJsonPath('data.0.last_message.sender_id', $b->id)
            ->assertJsonPath('data.0.unread_count', 2);
        $one = count(DB::getQueryLog());
        for ($i = 0; $i < 3; $i++) {
            $other = $this->member();
            $conversation = $this->start($a, $other);
            Message::create(['conversation_id' => $conversation, 'sender_id' => $other->id, 'body' => 'Other preview', 'client_id' => (string) Str::uuid()]);
        }
        DB::flushQueryLog();
        $this->actingAs($a)->getJson('/api/v1/conversations')->assertOk()->assertJsonCount(4, 'data');
        $this->assertSame($one, count(DB::getQueryLog()), 'Inbox queries must not grow with each conversation.');
        DB::disableQueryLog();
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/block')->assertNoContent();
        $this->actingAs($a)->getJson('/api/v1/conversations')->assertJsonCount(3, 'data');
    }

    public function test_campus_boundary_and_pending_accounts_are_denied(): void
    {
        $a = $this->member();
        $b = $this->member();
        $other = Institution::create(['name' => 'Other', 'slug' => 'other']);
        $b->affiliation->update(['institution_id' => $other->id]);
        $this->actingAs($a)->postJson('/api/v1/conversations', ['user_id' => $b->id])->assertNotFound();
        $a->forceFill(['verification_state' => 'pending'])->save();
        $this->getJson('/api/v1/conversations')->assertForbidden();
        $this->getJson('/api/v1/notifications')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_notifications_are_private_persisted_deduplicated_and_visibility_rechecked(): void
    {
        $a = $this->member();
        $b = $this->member();
        $c = $this->member();
        $p = new Post(['body' => 'Story', 'visibility' => 'campus']);
        $p->forceFill(['user_id' => $a->id, 'institution_id' => $a->affiliation->institution_id])->save();
        $this->actingAs($b)->putJson('/api/v1/posts/'.$p->id.'/interactions/like')->assertOk();
        $this->putJson('/api/v1/posts/'.$p->id.'/interactions/like')->assertOk();
        $this->assertSame(1, DB::table('notifications')->count());
        $nid = $this->actingAs($a)->getJson('/api/v1/notifications')->assertJsonPath('data.0.kind', 'likes')->assertJsonPath('unread_count', 1)->json('data.0.id');
        $this->actingAs($c)->putJson('/api/v1/notifications/'.$nid.'/read')->assertNotFound();
        $this->actingAs($a)->putJson('/api/v1/notifications/'.$nid.'/read')->assertNoContent();
        $this->getJson('/api/v1/notifications')->assertJsonPath('unread_count', 0);
        $this->putJson('/api/v1/relationships/'.$b->id.'/block')->assertNoContent();
        $this->getJson('/api/v1/notifications')->assertJsonCount(0, 'data');
    }

    public function test_preferences_are_validated_and_disabled_notifications_not_created(): void
    {
        $a = $this->member();
        $b = $this->member();
        $this->actingAs($a)->patchJson('/api/v1/communication-preferences', ['dm_policy' => 'nobody', 'notification_preferences' => ['messages' => false]])->assertOk()->assertJsonPath('data.dm_policy', 'nobody');
        $this->patchJson('/api/v1/communication-preferences', ['dm_policy' => 'all'])->assertUnprocessable();
        $this->patchJson('/api/v1/communication-preferences', ['notification_preferences' => ['role' => true]])->assertUnprocessable();
        app(CampusActivity::class)->send($a, $b, 'messages');
        $this->assertSame(0, DB::table('notifications')->count());
        $this->getJson('/api/v1/realtime')->assertOk()->assertJsonMissing(['secret' => config('broadcasting.connections.reverb.secret')]);
    }

    public function test_private_channel_auth_only_allows_own_campus_scoped_user(): void
    {
        config(['broadcasting.default' => 'reverb', 'broadcasting.connections.reverb' => ['driver' => 'reverb', 'key' => 'testing-key', 'secret' => 'testing-secret', 'app_id' => 'testing-id', 'options' => ['host' => 'localhost', 'port' => 8080, 'scheme' => 'http', 'useTLS' => false]]]);
        require base_path('routes/channels.php');
        $a = $this->member();
        $b = $this->member();
        $this->actingAs($a)->postJson('/api/v1/broadcasting/auth', ['socket_id' => '1.2', 'channel_name' => 'private-App.Models.User.'.$a->id])->assertOk()->assertJsonStructure(['auth']);
        $this->postJson('/api/v1/broadcasting/auth', ['socket_id' => '1.2', 'channel_name' => 'private-App.Models.User.'.$b->id])->assertForbidden();
        $a->forceFill(['verification_state' => 'suspended'])->save();
        $this->postJson('/api/v1/broadcasting/auth', ['socket_id' => '1.2', 'channel_name' => 'private-App.Models.User.'.$a->id])->assertForbidden();
    }

    public function test_filtered_unread_count_and_mandatory_notices_work_without_campus_access(): void
    {
        $a = $this->member();
        $b = $this->member();
        $admin = $this->member();
        $admin->forceFill(['role' => 'administrator'])->save();
        app(CampusActivity::class)->send($a, $b, 'follows');
        $this->actingAs($a)->getJson('/api/v1/notifications')->assertJsonPath('unread_count', 1);
        $this->putJson('/api/v1/relationships/'.$b->id.'/block')->assertNoContent();
        $this->getJson('/api/v1/notifications')->assertJsonCount(0, 'data')->assertJsonPath('unread_count', 0);
        app(CampusActivity::class)->send($a, $admin, 'moderation', ['message' => 'Keputusan moderasi tersimpan.']);
        $a->forceFill(['verification_state' => 'suspended'])->save();
        $this->actingAs($a)->getJson('/api/v1/notifications')->assertJsonCount(1, 'data')->assertJsonPath('data.0.message', 'Keputusan moderasi tersimpan.')->assertJsonPath('unread_count', 1);
        $token = $a->createToken('restricted', ['profile:read']);
        $this->app['auth']->forgetGuards();
        $this->withToken($token->plainTextToken)->getJson('/api/v1/notifications')->assertJsonCount(1, 'data');
    }

    public function test_notification_listing_batches_actors_and_does_not_query_once_per_row(): void
    {
        $viewer = $this->member();
        for ($i = 0; $i < 20; $i++) {
            app(CampusActivity::class)->send($viewer, $this->member(), 'follows');
        }
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($viewer)->getJson('/api/v1/notifications')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('unread_count', 20);
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertLessThanOrEqual(10, $queries, 'Notification reads must batch actor records.');
    }
}
