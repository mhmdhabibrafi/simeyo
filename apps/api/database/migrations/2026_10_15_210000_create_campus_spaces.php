<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->restrictOnDelete();
            $t->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $t->foreignId('faculty_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name', 80);
            $t->text('description');
            $t->text('rules')->nullable();
            $t->string('visibility')->default('campus');
            $t->boolean('organization_requested')->default(false);
            $t->boolean('organization_verified')->default(false);
            $t->timestamps();
            $t->softDeletes();
            $t->index(['institution_id', 'id']);
        });
        Schema::create('community_members', function (Blueprint $t) {
            $t->id();
            $t->foreignId('community_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('role')->default('member');
            $t->string('state')->default('active');
            $t->timestamps();
            $t->unique(['community_id', 'user_id']);
        });
        Schema::table('posts', function (Blueprint $t) {
            $t->foreignId('community_id')->nullable()->constrained()->restrictOnDelete();
            $t->index(['community_id', 'id']);
        });
        Schema::create('campus_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('community_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('title', 120);
            $t->text('description');
            $t->string('location', 200);
            $t->timestamp('starts_at');
            $t->timestamp('ends_at');
            $t->timestamps();
            $t->softDeletes();
            $t->index(['institution_id', 'starts_at']);
        });
        Schema::create('event_attendees', function (Blueprint $t) {
            $t->id();
            $t->foreignId('campus_event_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('state');
            $t->timestamps();
            $t->unique(['campus_event_id', 'user_id']);
        });
        Schema::create('hashtags', function (Blueprint $t) {
            $t->id();
            $t->string('name', 40)->unique();
        });
        Schema::create('post_hashtags', function (Blueprint $t) {
            $t->foreignId('post_id')->constrained()->cascadeOnDelete();
            $t->foreignId('hashtag_id')->constrained()->cascadeOnDelete();
            $t->primary(['post_id', 'hashtag_id']);
        });
        Schema::create('post_mentions', function (Blueprint $t) {
            $t->foreignId('post_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->primary(['post_id', 'user_id']);
        });
        Schema::table('reports', function (Blueprint $t) {
            $t->string('resolution')->nullable();
            $t->text('review_note')->nullable();
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reports', fn (Blueprint $t) => $t->dropColumn(['resolution', 'review_note', 'reviewed_by', 'reviewed_at']));
        foreach (['post_mentions', 'post_hashtags', 'hashtags', 'event_attendees', 'campus_events'] as $t) {
            Schema::dropIfExists($t);
        }
        Schema::table('posts', fn (Blueprint $t) => $t->dropConstrainedForeignId('community_id'));
        Schema::dropIfExists('community_members');
        Schema::dropIfExists('communities');
    }
};
