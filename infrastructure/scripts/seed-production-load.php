<?php

if (getenv('CI') !== 'true' || getenv('GITHUB_ACTIONS') !== 'true' || getenv('DB_DATABASE') !== 'simeyo_production_ci') {
    throw new RuntimeException('Load fixtures require the disposable production-stack CI database.');
}
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
try {
$db = Illuminate\Support\Facades\DB::class;
$institution = App\Models\Institution::firstOrFail();
$password = Illuminate\Support\Facades\Hash::make(getenv('DEMO_PASSWORD'));
$users = [];
$db::transaction(function () use (&$users, $db, $institution, $password) {
    for ($i = 0; $i < 100; $i++) {
        $u = App\Models\User::create(['name' => 'Load fixture '.$i, 'username' => 'load_fixture_'.$i, 'email' => 'load'.$i.'@example.invalid', 'password' => $password]);
        $u->forceFill(['verification_state' => 'approved', 'email_verified_at' => now(), 'onboarded_at' => now()])->save();
        $u->profile()->create(['private_account' => $i % 10 === 0]);
        $u->affiliation()->create(['institution_id' => $institution->id]);
        $users[] = $u;
    }
    $rows = [];
    for ($i = 0; $i < 5000; $i++) {
        $rows[] = ['institution_id' => $institution->id, 'user_id' => $users[$i % 100]->id, 'body' => 'Synthetic campus load story '.$i, 'visibility' => $i % 5 === 0 ? 'followers' : 'campus', 'created_at' => now()->subMinutes($i), 'updated_at' => now()];
        if (count($rows) === 500) {
            $db::table('posts')->insert($rows);
            $rows = [];
        }
    }
    $roots = App\Models\Post::whereIn('user_id', array_map(fn ($u) => $u->id, $users))->orderBy('id')->limit(500)->get();
    foreach ($roots as $i => $root) {
        $reply = App\Models\Post::forceCreate(['institution_id' => $institution->id, 'user_id' => $users[($i + 1) % 100]->id, 'parent_id' => $root->id, 'root_id' => $root->id, 'depth' => 1, 'body' => 'Synthetic threaded reply '.$i, 'visibility' => 'campus']);
        $db::table('post_dependencies')->insert(['post_id' => $reply->id, 'source_id' => $root->id]);
        $db::table('post_reactions')->insert(['post_id' => $root->id, 'user_id' => $users[($i + 2) % 100]->id, 'created_at' => now(), 'updated_at' => now()]);
    }
    foreach (array_slice($users, 0, 4) as $viewer) {
        foreach (array_slice($users, 10, 30) as $author) {
            $db::table('follows')->insert(['follower_id' => $viewer->id, 'followed_id' => $author->id, 'state' => 'accepted', 'created_at' => now(), 'updated_at' => now()]);
        }
        foreach (['blocks' => 98, 'mutes' => 99] as $table => $i) {
            $db::table($table)->insert(['user_id' => $viewer->id, 'target_id' => $users[$i]->id, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
});
foreach (['users', 'user_profiles', 'user_affiliations', 'posts', 'post_dependencies', 'post_reactions', 'follows', 'blocks', 'mutes'] as $table) {
    $db::statement('ANALYZE '.$table);
}
$visibility = app(App\Services\PostVisibility::class);
$query = $visibility->hydrate($visibility->query($users[0])->whereNull('parent_id'), $users[0])->orderByDesc('posts.id')->limit(20);
$plan = $db::select('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '.$query->toSql(), $query->getBindings());
echo json_encode(['scope' => 'Synthetic isolated CI fixture; no real user data', 'users' => 100, 'root_posts' => 5000, 'replies' => 500, 'reactions' => 500, 'follows' => 120, 'campus_feed_query_plan' => json_decode($plan[0]->{'QUERY PLAN'}, true)], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Isolated load fixture failed: '.get_class($error).PHP_EOL);
    exit(1);
}
