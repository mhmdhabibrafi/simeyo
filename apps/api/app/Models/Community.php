<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Community extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['organization_requested' => 'boolean', 'organization_verified' => 'boolean'];
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'community_members')->withPivot('role', 'state');
    }
}
