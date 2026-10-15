<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedSnapshot extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['post_ids' => 'array', 'expires_at' => 'datetime'];
    }
}
