<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follows', function (Blueprint $t) {
            $t->id();
            $t->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('followed_id')->constrained('users')->cascadeOnDelete();
            $t->enum('state', ['pending', 'accepted']);
            $t->timestamps();
            $t->unique(['follower_id', 'followed_id']);
            $t->index(['followed_id', 'state']);
        });
        foreach (['blocks', 'mutes'] as $table) {
            Schema::create($table, function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->foreignId('target_id')->constrained('users')->cascadeOnDelete();
                $t->timestamps();
                $t->unique(['user_id', 'target_id']);
                $t->index('target_id');
            });
        }
        Schema::create('posts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('parent_id')->nullable()->constrained('posts')->restrictOnDelete();
            $t->foreignId('root_id')->nullable()->constrained('posts')->restrictOnDelete();
            $t->foreignId('quote_id')->nullable()->constrained('posts')->restrictOnDelete();
            $t->text('body');
            $t->enum('visibility', ['campus', 'followers'])->default('campus');
            $t->unsignedSmallInteger('depth')->default(0);
            $t->timestamp('edited_at')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['institution_id', 'parent_id', 'id']);
            $t->index(['user_id', 'id']);
            $t->index(['root_id', 'id']);
            $t->index('quote_id');
        });
        Schema::create('post_dependencies', function (Blueprint $t) {
            $t->foreignId('post_id')->constrained()->cascadeOnDelete();
            $t->foreignId('source_id')->constrained('posts')->cascadeOnDelete();
            $t->primary(['post_id', 'source_id']);
            $t->index('source_id');
        });
        Schema::create('post_media', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('post_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('path')->unique();
            $t->unsignedInteger('width');
            $t->unsignedInteger('height');
            $t->unsignedInteger('bytes');
            $t->timestamps();
            $t->index(['user_id', 'post_id']);
        });
        foreach (['post_reactions', 'post_reposts', 'bookmarks'] as $table) {
            Schema::create($table, function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->foreignId('post_id')->constrained()->cascadeOnDelete();
                $t->timestamps();
                $t->unique(['user_id', 'post_id']);
                $t->index(['post_id', 'id']);
            });
        }
        Schema::create('reports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('post_id')->constrained()->cascadeOnDelete();
            $t->enum('reason', ['spam', 'harassment', 'hate', 'misinformation', 'other']);
            $t->text('details')->nullable();
            $t->enum('state', ['pending', 'dismissed', 'actioned'])->default('pending');
            $t->timestamps();
            $t->unique(['user_id', 'post_id']);
            $t->index(['state', 'id']);
        });
        Schema::create('feed_snapshots', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->json('post_ids');
            $t->timestamp('expires_at')->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['feed_snapshots', 'reports', 'bookmarks', 'post_reposts', 'post_reactions', 'post_media', 'post_dependencies', 'posts', 'mutes', 'blocks', 'follows'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
