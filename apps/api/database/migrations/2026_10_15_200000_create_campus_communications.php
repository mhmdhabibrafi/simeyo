<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $t) {
            $t->string('dm_policy')->default('followers');
            $t->json('notification_preferences')->nullable();
        });
        Schema::create('conversations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->restrictOnDelete();
            $t->foreignId('first_user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('second_user_id')->constrained('users')->cascadeOnDelete();
            $t->unique(['first_user_id', 'second_user_id']);
            $t->timestamps();
        });
        Schema::create('conversation_participants', function (Blueprint $t) {
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('last_read_message_id')->default(0);
            $t->primary(['conversation_id', 'user_id']);
        });
        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $t->uuid('client_id');
            $t->text('body');
            $t->timestamps();
            $t->unique(['sender_id', 'client_id']);
            $t->index(['conversation_id', 'id']);
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('type');
            $t->morphs('notifiable');
            $t->text('data');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['notifiable_id', 'read_at', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['notifications', 'messages', 'conversation_participants', 'conversations'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('user_profiles', fn (Blueprint $t) => $t->dropColumn(['dm_policy', 'notification_preferences']));
    }
};
