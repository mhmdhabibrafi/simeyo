<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $r): array
    {
        $author = $this->author;
        $a = $author->affiliation;

        return ['id' => $this->id, 'body' => $this->body, 'visibility' => $this->visibility, 'parent_id' => $this->parent_id, 'root_id' => $this->root_id, 'depth' => $this->depth, 'quote_id' => $this->quote_id, 'reposted_by' => $this->reposted_by,
            'created_at' => $this->created_at->toISOString(), 'edited_at' => $this->edited_at?->toISOString(),
            'author' => ['id' => $author->id, 'name' => $author->name, 'username' => $author->username, 'verified' => $author->verification_state === 'approved', 'avatar_url' => $author->profile?->avatar_path ? '/media/'.$author->profile->avatar_path : null, 'department' => $author->profile?->academic_visible ? $a?->department?->name : null],
            'media' => $this->media->map(fn ($m) => ['id' => $m->id, 'url' => '/api/v1/media/posts/'.$m->id, 'width' => $m->width, 'height' => $m->height]),
            'quote' => $this->quote ? ['id' => $this->quote->id, 'body' => $this->quote->body, 'author' => ['name' => $this->quote->author->name, 'username' => $this->quote->author->username], 'media' => $this->quote->media->map(fn ($m) => ['id' => $m->id, 'url' => '/api/v1/media/posts/'.$m->id, 'width' => $m->width, 'height' => $m->height])] : null,
            'likes_count' => (int) $this->reactions_count, 'reposts_count' => (int) $this->reposts_count, 'replies_count' => (int) $this->replies_count,
            'liked' => (bool) $this->liked, 'reposted' => (bool) $this->reposted, 'bookmarked' => (bool) $this->bookmarked, 'can_edit' => $r->user()->id === $this->user_id];
    }
}
