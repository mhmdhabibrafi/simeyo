<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\PostEntities;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class IndexPostEntities extends Command
{
    protected $signature = 'ruang:index-post-entities';

    protected $description = 'Index existing hashtags/mentions without sending historical notifications';

    public function handle(PostEntities $entities): int
    {
        Post::with('author.affiliation', 'author.profile')->chunkById(100, function ($posts) use ($entities) {
            foreach ($posts as $p) {
                DB::transaction(fn () => $entities->sync($p, false));
            }
        });
        $this->info('Existing entity indexes refreshed; historical notifications were not sent.');

        return self::SUCCESS;
    }
}
