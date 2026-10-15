<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Seeder;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo seeding is prohibited outside local/testing.');
        }
        $password = env('DEMO_PASSWORD');
        if (! $password || strlen($password) < 12) {
            throw new \RuntimeException('Set DEMO_PASSWORD (12+ characters) in local environment first.');
        }
        $this->call(InstitutionSeeder::class);
        $institution = Institution::where('slug', 'uin-suska-riau')->firstOrFail();
        foreach (['nadia' => 'Nadia Putri', 'rafi' => 'Rafi Pratama', 'admin' => 'Administrator Demo'] as $username => $name) {
            $u = User::firstOrCreate(['email' => $username.'@example.test'], ['name' => $name, 'username' => $username, 'password' => $password]);
            $u->forceFill(['role' => $username === 'admin' ? 'administrator' : 'student', 'email_verified_at' => now(), 'verification_state' => 'approved', 'onboarded_at' => now()])->save();
            $u->profile()->firstOrCreate([], ['bio' => 'Akun fiktif untuk pengujian lokal Simeyo.']);
            $u->affiliation()->firstOrCreate([], ['institution_id' => $institution->id]);
        }
    }
}
