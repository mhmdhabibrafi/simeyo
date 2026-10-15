<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_devices', function (Blueprint $table) {
            $table->index('user_id');
        });
        Schema::table('push_receipts', function (Blueprint $table) {
            $table->index(['notification_id', 'push_device_id']);
            $table->index('push_device_id');
        });
    }

    public function down(): void
    {
        Schema::table('push_receipts', function (Blueprint $table) {
            $table->dropIndex(['notification_id', 'push_device_id']);
            $table->dropIndex(['push_device_id']);
        });
        Schema::table('push_devices', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }
};
