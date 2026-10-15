<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $t) {
            $t->foreignId('actor_id')->nullable()->constrained('users')->cascadeOnDelete();
            $t->foreignId('post_id')->nullable()->constrained()->cascadeOnDelete();
            $t->foreignId('conversation_id')->nullable()->constrained()->cascadeOnDelete();
            $t->string('kind')->nullable()->index();
        });
        DB::table('notifications')->orderBy('id')->chunkById(100, function ($rows) {
            foreach ($rows as $row) {
                $d = json_decode($row->data, true);
                if (isset($d['actor_id'],$d['kind'])) {
                    DB::table('notifications')->where('id', $row->id)->update(['actor_id' => $d['actor_id'], 'kind' => $d['kind'], 'post_id' => $d['post_id'] ?? null, 'conversation_id' => $d['conversation_id'] ?? null]);
                }
            }
        }, 'id');
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $t) {
            $t->dropConstrainedForeignId('actor_id');
            $t->dropConstrainedForeignId('post_id');
            $t->dropConstrainedForeignId('conversation_id');
            $t->dropColumn('kind');
        });
    }
};
