<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('post_media', function (Blueprint $table) {
            $table->unsignedInteger('position')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('post_media', fn (Blueprint $table) => $table->dropColumn('position'));
    }
};
