<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Affiliation extends Model
{
    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function cohort()
    {
        return $this->belongsTo(AcademicCohort::class, 'academic_cohort_id');
    }

    protected $table = 'user_affiliations';

    protected $guarded = ['id', 'user_id'];

    public function institution()
    {
        return $this->belongsTo(Institution::class);
    }
}
