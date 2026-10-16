<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Post;
use App\Models\PostMedia;
use App\Models\User;
use Database\Seeders\InstitutionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SocialCoreTest extends TestCase
{
    public function test_posts_accept_more_than_four_images_and_uploads_above_four_megabytes(): void
    {
        Storage::fake('local');
        $u = $this->member();
        $ids = [];
        $this->actingAs($u)->postJson('/api/v1/me/media', ['kind' => 'avatar', 'image' => UploadedFile::fake()->image('avatar.jpg', 64, 64)->size(6000)])->assertOk();
        for ($i = 0; $i < 6; $i++) {
            $ids[] = $this->actingAs($u)->postJson('/api/v1/media/posts', ['image' => UploadedFile::fake()->image("campus-$i.jpg", 64, 64)->size(6000)])->assertCreated()->json('data.id');
        }
        $this->postJson('/api/v1/posts', ['body' => 'Galeri kampus', 'visibility' => 'campus', 'media_ids' => $ids])->assertCreated()->assertJsonCount(6, 'data.media');
    }

    public function test_mobile_post_retry_identity_prevents_duplicates_and_supports_attached_media_retry(): void
    {
        $u = $this->member();
        $other = $this->member();
        $key = (string) Str::uuid();
        $draft = ['body' => 'Cerita dari jaringan mobile', 'visibility' => 'campus', 'client_id' => $key];
        $id = $this->actingAs($u)->postJson('/api/v1/posts', $draft)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/posts', $draft)->assertCreated()->assertJsonPath('data.id', $id);
        $this->assertSame(1, Post::count());
        $this->postJson('/api/v1/posts', array_replace($draft, ['body' => 'Isi berbeda']))->assertConflict();
        $this->actingAs($other)->postJson('/api/v1/posts', $draft)->assertCreated();
        $this->assertSame(2, Post::count());
        $this->actingAs($u)->deleteJson('/api/v1/posts/'.$id)->assertNoContent();
        $this->postJson('/api/v1/posts', $draft)->assertConflict();
        Storage::fake('local');
        $media = $this->postJson('/api/v1/media/posts', ['image' => UploadedFile::fake()->image('retry.jpg', 64, 64)])->assertCreated()->json('data.id');
        $imageDraft = ['body' => '', 'visibility' => 'campus', 'media_ids' => [$media], 'client_id' => (string) Str::uuid()];
        $imageId = $this->postJson('/api/v1/posts', $imageDraft)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/posts', $imageDraft)->assertCreated()->assertJsonPath('data.id', $imageId)->assertJsonCount(1, 'data.media');
    }

    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(InstitutionSeeder::class);
    }

    private function member(bool $private = false): User
    {
        $u = User::factory()->create(['username' => 'member_'.bin2hex(random_bytes(4)), 'verification_state' => 'approved', 'onboarded_at' => now()]);
        $u->profile()->create(['private_account' => $private]);
        $u->affiliation()->create(['institution_id' => Institution::first()->id]);

        return $u;
    }

    private function fixturePost(User $u, string $body = 'Cerita kampus', string $visibility = 'campus'): Post
    {
        $p = new Post(['body' => $body, 'visibility' => $visibility]);
        $p->forceFill(['user_id' => $u->id, 'institution_id' => $u->affiliation->institution_id])->save();

        return $p;
    }

    public function test_posts_replies_edit_delete_persist_and_authorize(): void
    {
        $a = $this->member();
        $b = $this->member();
        $id = $this->actingAs($a)->postJson('/api/v1/posts', ['body' => 'Cerita baru', 'visibility' => 'campus'])->assertCreated()->json('data.id');
        $reply = $this->actingAs($b)->postJson('/api/v1/posts', ['body' => 'Balasan pertama', 'visibility' => 'campus', 'parent_id' => $id])->assertCreated()->assertJsonPath('data.root_id', $id)->json('data.id');
        $nested = $this->postJson('/api/v1/posts', ['body' => 'Balasan bertingkat', 'visibility' => 'campus', 'parent_id' => $reply])->assertCreated()->assertJsonPath('data.depth', 2)->json('data.id');
        $this->patchJson('/api/v1/posts/'.$id, ['body' => 'Ubah tanpa izin', 'visibility' => 'campus'])->assertForbidden();
        $this->deleteJson('/api/v1/posts/'.$id)->assertForbidden();
        $this->actingAs($a)->patchJson('/api/v1/posts/'.$id, ['body' => 'Sudah diedit', 'visibility' => 'campus'])->assertOk()->assertJsonPath('data.body', 'Sudah diedit');
        $this->assertNotNull(Post::find($id)->edited_at);
        $this->deleteJson('/api/v1/posts/'.$id)->assertNoContent();
        $this->actingAs($b)->getJson('/api/v1/posts/'.$nested)->assertNotFound();
        $this->getJson('/api/v1/feed?feed=campus')->assertJsonCount(0, 'data');
    }

    public function test_interactions_are_idempotent_and_counts_authoritative(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->fixturePost($a);
        $this->actingAs($b);
        foreach (['like' => 'likes_count', 'repost' => 'reposts_count', 'bookmark' => null] as $kind => $count) {
            $this->putJson('/api/v1/posts/'.$p->id.'/interactions/'.$kind)->assertOk();
            $r = $this->putJson('/api/v1/posts/'.$p->id.'/interactions/'.$kind)->assertOk();
            if ($count) {
                $r->assertJsonPath('data.'.$count, 1);
            }
            if ($kind === 'bookmark') {
                $this->getJson('/api/v1/feed?feed=bookmarks')->assertJsonCount(1, 'data');
            }
            $this->deleteJson('/api/v1/posts/'.$p->id.'/interactions/'.$kind)->assertOk();
            $r = $this->deleteJson('/api/v1/posts/'.$p->id.'/interactions/'.$kind)->assertOk();
            if ($count) {
                $r->assertJsonPath('data.'.$count, 0);
            }
        }
    }

    public function test_private_follow_requires_acceptance_and_repeat_put_preserves_it(): void
    {
        $private = $this->member(true);
        $viewer = $this->member();
        $p = $this->fixturePost($private);
        $this->actingAs($viewer)->getJson('/api/v1/posts/'.$p->id)->assertNotFound();
        $this->putJson('/api/v1/relationships/'.$private->id.'/follow')->assertOk()->assertJsonPath('data.follow_state', 'pending');
        $this->getJson('/api/v1/posts/'.$p->id)->assertNotFound();
        $this->actingAs($private)->getJson('/api/v1/follow-requests')->assertJsonCount(1, 'data');
        $this->patchJson('/api/v1/follow-requests/'.$viewer->id, ['accept' => true])->assertNoContent();
        $this->actingAs($viewer)->putJson('/api/v1/relationships/'.$private->id.'/follow')->assertJsonPath('data.follow_state', 'accepted');
        $this->getJson('/api/v1/posts/'.$p->id)->assertOk();
        $this->deleteJson('/api/v1/relationships/'.$private->id.'/follow')->assertOk();
        $this->getJson('/api/v1/posts/'.$p->id)->assertNotFound();
    }

    public function test_follower_visibility_and_following_feed(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->fixturePost($a, 'Hanya pengikut', 'followers');
        $this->actingAs($b)->getJson('/api/v1/posts/'.$p->id)->assertNotFound();
        $this->putJson('/api/v1/relationships/'.$a->id.'/follow')->assertOk();
        $this->getJson('/api/v1/feed?feed=following')->assertJsonPath('data.0.id', $p->id);
    }

    public function test_block_is_bilateral_removes_edges_and_hides_dependencies_media_profiles(): void
    {
        Storage::fake('local');
        $a = $this->member();
        $b = $this->member();
        $source = $this->fixturePost($a);
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/follow')->assertOk();
        $quote = $this->postJson('/api/v1/posts', ['body' => 'Kutipan', 'visibility' => 'campus', 'quote_id' => $source->id])->assertCreated()->json('data.id');
        $this->actingAs($a)->putJson('/api/v1/relationships/'.$b->id.'/block')->assertNoContent();
        $this->getJson('/api/v1/posts/'.$quote)->assertNotFound();
        $this->actingAs($b)->getJson('/api/v1/posts/'.$source->id)->assertNotFound();
        $this->getJson('/api/v1/profiles/'.$a->username)->assertNotFound();
        $this->putJson('/api/v1/posts/'.$source->id.'/interactions/like')->assertNotFound();
        $this->assertDatabaseCount('follows', 0);
    }

    public function test_mute_filters_feeds_without_changing_direct_visibility(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->fixturePost($a);
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/mute')->assertNoContent();
        $this->getJson('/api/v1/feed?feed=campus')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/posts/'.$p->id)->assertOk();
    }

    public function test_quote_and_reply_depend_on_live_accessible_source(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->fixturePost($a);
        $this->actingAs($b);
        $quote = $this->postJson('/api/v1/posts', ['body' => 'Kutipan saya', 'visibility' => 'campus', 'quote_id' => $p->id])->assertCreated()->assertJsonPath('data.quote.body', $p->body)->json('data.id');
        $nested = $this->postJson('/api/v1/posts', ['body' => 'Kutipan lanjutan', 'visibility' => 'campus', 'quote_id' => $quote])->assertCreated()->json('data.id');
        $a->profile()->update(['private_account' => true]);
        $this->getJson('/api/v1/posts/'.$quote)->assertNotFound();
        $this->getJson('/api/v1/posts/'.$nested)->assertNotFound();
    }

    public function test_cursor_feeds_do_not_duplicate_after_new_posts_and_engagement(): void
    {
        $a = $this->member();
        $b = $this->member();
        for ($i = 0; $i < 8; $i++) {
            $this->fixturePost($a, 'Cerita '.$i);
        }$this->actingAs($b);
        foreach (['campus', 'for-you'] as $feed) {
            $first = $this->getJson('/api/v1/feed?feed='.$feed.'&limit=3')->assertOk();
            $ids = array_column($first->json('data'), 'id');
            $cursor = $first->json('meta.next_cursor');
            $this->fixturePost($a, 'Sesudah halaman pertama');
            $this->putJson('/api/v1/posts/'.$ids[0].'/interactions/like')->assertOk();
            $second = $this->getJson('/api/v1/feed?feed='.$feed.'&limit=3&cursor='.urlencode($cursor))->assertOk();
            $this->assertEmpty(array_intersect($ids, array_column($second->json('data'), 'id')));
            $this->assertCount(3, $second->json('data'));
        }
    }

    public function test_recommendation_cursor_is_owner_bound_and_permission_rechecked(): void
    {
        $a = $this->member();
        $b = $this->member();
        $c = $this->member();
        for ($i = 0; $i < 5; $i++) {
            $this->fixturePost($a);
        }$cursor = $this->actingAs($b)->getJson('/api/v1/feed?feed=for-you&limit=2')->assertOk()->json('meta.next_cursor');
        $this->actingAs($c)->getJson('/api/v1/feed?feed=for-you&cursor='.urlencode($cursor))->assertStatus(410);
        $this->actingAs($b)->putJson('/api/v1/relationships/'.$a->id.'/block')->assertNoContent();
        $this->getJson('/api/v1/feed?feed=for-you&cursor='.urlencode($cursor))->assertJsonCount(0, 'data');
    }

    public function test_cross_institution_unverified_and_suspended_cannot_read_or_publish(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->fixturePost($a);
        $i = Institution::create(['name' => 'Other', 'slug' => 'other']);
        $b->affiliation()->update(['institution_id' => $i->id]);
        $this->actingAs($b->fresh())->getJson('/api/v1/posts/'.$p->id)->assertNotFound();
        foreach (['pending', 'suspended'] as $state) {
            $b->forceFill(['verification_state' => $state])->save();
            $this->actingAs($b)->getJson('/api/v1/feed')->assertForbidden();
            $this->postJson('/api/v1/posts', ['body' => 'Tidak boleh', 'visibility' => 'campus'])->assertForbidden();
        }
    }

    public function test_media_validation_ownership_private_access_and_image_only_post(): void
    {
        Storage::fake('local');
        $a = $this->member();
        $b = $this->member();
        $this->actingAs($a)->postJson('/api/v1/media/posts', ['image' => UploadedFile::fake()->create('bad.svg', 10, 'image/svg+xml')])->assertUnprocessable();
        $id = $this->postJson('/api/v1/media/posts', ['image' => UploadedFile::fake()->image('photo.png', 2200, 1000)])->assertCreated()->json('data.id');
        $this->assertLessThanOrEqual(1920, PostMedia::find($id)->width);
        $this->actingAs($b)->get('/api/v1/media/posts/'.$id)->assertNotFound();
        $this->postJson('/api/v1/posts', ['body' => 'Bukan milik saya', 'visibility' => 'campus', 'media_ids' => [$id]])->assertUnprocessable();
        $post = $this->actingAs($a)->postJson('/api/v1/posts', ['body' => '', 'visibility' => 'followers', 'media_ids' => [$id]])->assertCreated()->json('data.id');
        $this->get('/api/v1/media/posts/'.$id)->assertOk();
        $this->actingAs($b)->get('/api/v1/media/posts/'.$id)->assertNotFound();
        $this->actingAs($a)->deleteJson('/api/v1/posts/'.$post)->assertNoContent();
        $this->get('/api/v1/media/posts/'.$id)->assertNotFound();
    }

    public function test_reposts_appear_in_profile_and_following_without_private_activity_leaks(): void
    {
        $author = $this->member();
        $reposter = $this->member();
        $viewer = $this->member();
        $p = $this->fixturePost($author);
        $this->actingAs($reposter)->putJson('/api/v1/posts/'.$p->id.'/interactions/repost')->assertOk();
        $this->actingAs($viewer)->getJson('/api/v1/feed?feed=profile&user_id='.$reposter->id)->assertJsonPath('data.0.id', $p->id)->assertJsonPath('data.0.reposted_by', $reposter->username);
        $this->putJson('/api/v1/relationships/'.$reposter->id.'/follow')->assertOk();
        $this->getJson('/api/v1/feed?feed=following')->assertJsonCount(1, 'data');
        $this->deleteJson('/api/v1/relationships/'.$reposter->id.'/follow')->assertOk();
        $reposter->profile()->update(['private_account' => true]);
        $this->getJson('/api/v1/feed?feed=profile&user_id='.$reposter->id)->assertJsonCount(0, 'data');
    }

    public function test_feed_queries_do_not_grow_with_each_author(): void
    {
        $viewer = $this->member();
        for ($i = 0; $i < 20; $i++) {
            $this->fixturePost($this->member(), 'Cerita berbeda '.$i);
        }
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->actingAs($viewer)->getJson('/api/v1/feed?feed=campus&limit=30')->assertOk()->assertJsonCount(20, 'data');
        $this->assertLessThanOrEqual(16, count(DB::getQueryLog()));
        DB::disableQueryLog();
    }

    public function test_reports_are_persisted_and_idempotent(): void
    {
        $a = $this->member();
        $b = $this->member();
        $p = $this->fixturePost($a);
        $this->actingAs($b);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/v1/posts/'.$p->id.'/report', ['reason' => 'spam', 'details' => 'Isi yang mengganggu.'])->assertCreated();
        }$this->assertDatabaseCount('reports', 1);
    }
}
