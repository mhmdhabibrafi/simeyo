<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class SocialDevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Social demo seeding is development-only.');
        }
        $password = env('DEMO_PASSWORD');
        if (! $password || strlen($password) < 12) {
            throw new \RuntimeException('Set a random local DEMO_PASSWORD first.');
        }
        $institution = Institution::where('slug', 'uin-suska-riau')->firstOrFail();
        $stories = [
            'demo_laras' => ['Laras Pramesti', 'Kadang ide terbaik buat tugas akhir justru muncul pas ngobrol di kantin. Ada yang lagi mencari teman diskusi riset minggu ini? #RisetKampus'],
            'demo_aditya' => ['Aditya Saputra', 'Satu hal yang aku pelajari semester ini: bertanya bukan berarti tertinggal. Justru percakapan dimulai dari situ.'],
            'demo_aisyah' => ['Aisyah Rahma', 'Bawa buku, cari sudut tenang, lalu pulang dengan ide baru. Kampus punya banyak ruang kecil yang menyenangkan. #CeritaKampus'],
            'demo_dimas' => ['Dimas Fadillah', 'Teman-teman yang suka desain, kalian biasanya mulai dari sketsa atau langsung eksplorasi digital? Ingin belajar proses yang berbeda.'],
            'demo_salma' => ['Salma Nabila', 'Pengingat kecil: istirahat juga bagian dari belajar. Semoga hari ini ada hal baik yang bikin kamu tersenyum.'],
        ];
        foreach ($stories as $username => [$name,$body]) {
            $u = User::where('username', $username)->first();
            if (! $u) {
                $u = User::create(['name' => $name, 'username' => $username, 'email' => $username.'@example.test', 'password' => $password]);
                $u->forceFill(['verification_state' => 'approved', 'email_verified_at' => now(), 'onboarded_at' => now()])->save();
                $u->profile()->create(['bio' => 'Akun fiktif development · belajar, bertemu, bercerita.']);
                $u->affiliation()->create(['institution_id' => $institution->id]);
            }
            if (! Post::where('user_id', $u->id)->where('body', $body)->exists()) {
                $p = new Post(['body' => $body, 'visibility' => 'campus']);
                $p->forceFill(['user_id' => $u->id, 'institution_id' => $institution->id])->save();
            }
        }
    }
}
