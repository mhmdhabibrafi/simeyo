<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('firebase_identities', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('project_id');
            $t->string('firebase_uid', 128);
            $t->string('campus_category');
            $t->unique(['project_id', 'firebase_uid']);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firebase_identities');
    }
};
