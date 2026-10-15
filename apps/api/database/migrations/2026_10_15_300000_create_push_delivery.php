<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_devices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('personal_access_token_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('token_hash', 64)->unique();
            $t->text('token');
            $t->string('name', 80);
            $t->string('platform', 12);
            $t->timestamps();
        });
        Schema::create('push_receipts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('push_device_id')->nullable()->constrained()->nullOnDelete();
            $t->uuid('notification_id');
            $t->string('receipt_id')->unique();
            $t->string('state')->default('accepted')->index();
            $t->string('error')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_receipts');
        Schema::dropIfExists('push_devices');
    }
};
