<?php

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        $i = Institution::firstOrCreate(['slug' => 'uin-suska-riau'], ['name' => 'UIN Sultan Syarif Kasim Riau', 'email_domains' => [], 'email_auto_approval' => false]);
        foreach (['Sains dan Teknologi' => ['Teknik Informatika', 'Sistem Informasi'], 'Ekonomi dan Ilmu Sosial' => ['Manajemen', 'Akuntansi'], 'Tarbiyah dan Keguruan' => ['Pendidikan Bahasa Inggris']] as $faculty => $departments) {
            DB::table('faculties')->insertOrIgnore(['institution_id' => $i->id, 'name' => $faculty, 'created_at' => now(), 'updated_at' => now()]);
            $id = DB::table('faculties')->where('institution_id', $i->id)->where('name', $faculty)->value('id');
            foreach ($departments as $name) {
                DB::table('departments')->insertOrIgnore(['faculty_id' => $id, 'name' => $name, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        foreach (range(2020, 2026) as $year) {
            DB::table('academic_cohorts')->insertOrIgnore(['institution_id' => $i->id, 'year' => $year, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
}
