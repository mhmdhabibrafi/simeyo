<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_reports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->restrictOnDelete();
            $t->foreignId('conversation_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('reported_user_id')->constrained('users')->restrictOnDelete();
            // Evidence is snapshotted; zero denotes a report with no incoming message.
            $t->unsignedBigInteger('message_id')->default(0);
            $t->text('body')->nullable();
            $t->string('reason');
            $t->text('details')->nullable();
            $t->string('state')->default('pending');
            $t->string('resolution')->nullable();
            $t->text('review_note')->nullable();
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamps();
            $t->unique(['conversation_id', 'user_id', 'message_id']);
            $t->index(['institution_id', 'state', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_reports');
    }
};
