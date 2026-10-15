<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class FirebaseIdentity
{
    public function verify(string $token): array
    {
        abort_unless(config('firebase.enabled'), 503, 'Google Sign-In belum tersedia.');
        try {
            $certificates = Cache::get('firebase.public-certificates');
            if (! $certificates) {
                $certificates = $this->certificates();
            }
            // This header is used only to select a trusted public key, never as identity proof.
            $header = json_decode(JWT::urlsafeB64Decode(explode('.', $token)[0]), true);
            if (! isset($certificates[$header['kid'] ?? '']) && Cache::add('firebase.certificate-refresh', true, 60)) {
                $certificates = $this->certificates();
            }
            $keys = [];
            foreach ($certificates as $kid => $certificate) {
                $keys[$kid] = new Key($certificate, 'RS256');
            }
            $claims = (array) JWT::decode($token, $keys);
            $project = config('firebase.project_id');
            $email = strtolower($claims['email'] ?? '');
            $domain = substr(strrchr($email, '@') ?: '', 1);
            if (($claims['aud'] ?? null) !== $project
                || ($claims['iss'] ?? null) !== 'https://securetoken.google.com/'.$project
                || ! is_string($claims['sub'] ?? null) || strlen($claims['sub']) < 1 || strlen($claims['sub']) > 128
                || ($claims['email_verified'] ?? false) !== true
                || ($claims['firebase']->sign_in_provider ?? null) !== 'google.com'
                || ! filter_var($email, FILTER_VALIDATE_EMAIL)
                || ! in_array($domain, ['students.uin-suska.ac.id', 'uin-suska.ac.id'], true)
                || ! is_numeric($claims['auth_time'] ?? null) || $claims['auth_time'] > time() + 30 || $claims['auth_time'] < time() - 300
                || ! is_int($claims['exp'] ?? null) || $claims['exp'] <= time()
                || ! is_int($claims['iat'] ?? null) || $claims['iat'] > time() + 30) {
                throw new \UnexpectedValueException;
            }

            return ['uid' => $claims['sub'], 'email' => $email, 'name' => mb_substr($claims['name'] ?? 'Warga Kampus', 0, 80), 'category' => $domain === 'students.uin-suska.ac.id' ? 'student' : 'staff'];
        } catch (\Throwable) {
            throw ValidationException::withMessages(['firebase_token' => 'Masuk dengan akun Google kampus yang terverifikasi. Silakan coba lagi.']);
        }
    }

    private function certificates(): array
    {
        $response = Http::timeout(10)->get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')->throw();
        preg_match('/max-age=(\d+)/', $response->header('Cache-Control'), $matches);
        $certificates = $response->json();
        Cache::put('firebase.public-certificates', $certificates, min(3600, max(1, (int) ($matches[1] ?? 1800))));

        return $certificates;
    }
}
