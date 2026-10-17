<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = ['body', 'visibility'];

    protected function casts(): array
    {
        return ['edited_at' => 'datetime'];
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function media()
    {
        return $this->hasMany(PostMedia::class)->orderBy('position')->orderBy('id');
    }

    public function replies()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function quote()
    {
        return $this->belongsTo(self::class, 'quote_id');
    }

    public function reactions()
    {
        return $this->hasMany(PostReaction::class);
    }

    public function reposts()
    {
        return $this->hasMany(PostRepost::class);
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class);
    }
}
