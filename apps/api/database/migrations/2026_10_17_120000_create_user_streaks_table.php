<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_streaks', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->date('last_active_date');
            $table->unsignedInteger('current_days');
            $table->unsignedInteger('longest_days');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_streaks');
    }
};
