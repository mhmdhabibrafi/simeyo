<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('institutions', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->json('email_domains')->nullable();
            $t->boolean('email_auto_approval')->default(false);
            $t->timestamps();
        });
        Schema::create('faculties', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->unique(['institution_id', 'name']);
            $t->timestamps();
        });
        Schema::create('departments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('faculty_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->unique(['faculty_id', 'name']);
            $t->timestamps();
        });
        Schema::create('academic_cohorts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $t->unsignedSmallInteger('year');
            $t->unique(['institution_id', 'year']);
            $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->string('username')->nullable()->unique();
            $t->enum('role', ['student', 'lecturer', 'alumni', 'organization_manager', 'moderator', 'administrator', 'super_administrator'])->default('student');
            $t->enum('verification_state', ['pending', 'approved', 'rejected', 'suspended'])->default('pending')->index();
            $t->timestamp('onboarded_at')->nullable();
        });
        Schema::create('user_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->text('bio')->nullable();
            $t->string('location')->nullable();
            $t->string('avatar_path')->nullable();
            $t->string('cover_path')->nullable();
            $t->json('links')->nullable();
            $t->json('interests')->nullable();
            $t->boolean('academic_visible')->default(false);
            $t->boolean('private_account')->default(false);
            $t->timestamps();
        });
        Schema::create('user_affiliations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->foreignId('institution_id')->constrained()->restrictOnDelete();
            $t->foreignId('faculty_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('academic_cohort_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });
        Schema::create('verification_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->enum('requested_affiliation', ['student', 'lecturer', 'alumni', 'organization_manager']);
            $t->enum('method', ['manual', 'institutional_email'])->default('manual');
            $t->enum('state', ['pending', 'approved', 'rejected', 'suspended'])->default('pending')->index();
            $t->text('statement');
            $t->text('review_note')->nullable();
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('subject_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('action')->index();
            $t->json('metadata')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['audit_logs', 'verification_requests', 'user_affiliations', 'user_profiles'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['username', 'role', 'verification_state', 'onboarded_at']));
        foreach (['academic_cohorts', 'departments', 'faculties', 'institutions'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
