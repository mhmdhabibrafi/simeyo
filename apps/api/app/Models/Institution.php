<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Institution extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['email_domains' => 'array', 'email_auto_approval' => 'boolean'];
    }
}
