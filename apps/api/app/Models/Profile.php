<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $table = 'user_profiles';

    protected $guarded = ['id', 'user_id'];

    protected function casts(): array
    {
        return ['links' => 'array', 'interests' => 'array', 'notification_preferences' => 'array', 'academic_visible' => 'boolean', 'private_account' => 'boolean'];
    }
}
