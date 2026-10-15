<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use App\Services\PostVisibility;

class PostPolicy
{
    public function view(User $user, Post $post): bool
    {
        return app(PostVisibility::class)->query($user)->whereKey($post->id)->exists();
    }

    public function update(User $user, Post $post): bool
    {
        return $post->user_id === $user->id && $this->view($user, $post);
    }

    public function delete(User $user, Post $post): bool
    {
        return $post->user_id === $user->id;
    }
}
