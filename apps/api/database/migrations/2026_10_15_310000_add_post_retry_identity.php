<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $t) {
            $t->uuid('client_id')->nullable();
            $t->string('request_hash', 64)->nullable();
            $t->unique(['user_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $t) {
            $t->dropUnique(['user_id', 'client_id']);
            $t->dropColumn(['client_id', 'request_hash']);
        });
    }
};
