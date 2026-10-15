<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function options()
    {
        return ['data' => [
            'registration_enabled' => (bool) config('registration.enabled'),
            'email_delivery_enabled' => (bool) config('registration.email_delivery_enabled'),
            'email_domains' => config('registration.email_domains'),
            'firebase' => config('firebase.enabled') ? ['apiKey' => config('firebase.api_key'), 'authDomain' => config('firebase.auth_domain'), 'projectId' => config('firebase.project_id'), 'appId' => config('firebase.app_id')] : null,
        ]];
    }

    public function register(Request $r)
    {
        abort_unless(config('registration.enabled'), 503, 'Pendaftaran belum tersedia. Silakan coba kembali nanti.');
        $r->merge(['email' => Str::lower((string) $r->input('email')), 'username' => Str::lower((string) $r->input('username'))]);
        $data = $r->validate(['name' => 'required|string|max:80', 'username' => 'required|string|regex:/^[a-z0-9_]{3,24}$/|unique:users', 'email' => 'required|email|max:254|unique:users', 'password' => ['required', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers()]]);
        $domains = config('registration.email_domains');
        if ($domains && ! in_array(Str::afterLast($data['email'], '@'), $domains, true)) {
            throw ValidationException::withMessages(['email' => 'Gunakan alamat email dengan domain kampus yang diizinkan.']);
        }
        $u = DB::transaction(function () use ($data) {
            $u = User::create($data);
            $u->profile()->create([]);

            return $u;
        });
        if (config('registration.email_delivery_enabled')) {
            event(new Registered($u));
        }
        Auth::login($u);
        $r->session()->regenerate();
        $r->session()->put('password_hash_web', Auth::guard('web')->hashPasswordForCookie($u->getAuthPassword()));

        return (new UserResource($u->refresh()))->response()->setStatusCode(201);
    }

    public function login(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        if (! Auth::attempt(['email' => Str::lower($d['email']), 'password' => $d['password']])) {
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi tidak sesuai.']);
        }
        $r->session()->regenerate();

        $r->session()->put('password_hash_web', Auth::guard('web')->hashPasswordForCookie($r->user()->getAuthPassword()));

        return new UserResource($r->user());
    }

    public function logout(Request $r)
    {
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->noContent();
    }

    public function forgot(Request $r)
    {
        abort_unless(config('registration.email_delivery_enabled'), 503, 'Pemulihan melalui email belum tersedia.');
        $d = $r->validate(['email' => 'required|email']);
        Password::sendResetLink(['email' => Str::lower($d['email'])]);

        return ['message' => 'Jika email terdaftar, tautan pemulihan akan dikirim.'];
    }

    public function resend(Request $r)
    {
        abort_unless(config('registration.email_delivery_enabled'), 503, 'Pengiriman email verifikasi belum tersedia.');
        if (! $r->user()->hasVerifiedEmail()) {
            $r->user()->sendEmailVerificationNotification();
        }

        return ['message' => 'Tautan verifikasi dikirim.'];
    }

    public function changePassword(Request $r)
    {
        $d = $r->validate([
            'current_password' => 'required|string|max:1024',
            'password' => ['required', 'confirmed', 'different:current_password', 'max:1024', PasswordRule::min(12)->mixedCase()->numbers()],
        ]);
        $web = ! ($r->user()->currentAccessToken() instanceof PersonalAccessToken) && $r->hasSession();
        $sessionId = $web ? $r->session()->getId() : null;
        $u = DB::transaction(function () use ($r, $d, $sessionId) {
            $u = User::whereKey($r->user()->id)->lockForUpdate()->firstOrFail();
            if (! Hash::check($d['current_password'], $u->password)) {
                throw ValidationException::withMessages(['current_password' => 'Kata sandi saat ini tidak sesuai.']);
            }
            $u->forceFill(['password' => $d['password'], 'remember_token' => Str::random(60)])->save();
            $u->tokens()->delete();
            DB::table('sessions')->where('user_id', $u->id)->when($sessionId, fn ($q) => $q->where('id', '!=', $sessionId))->delete();
            DB::table('password_reset_tokens')->where('email', $u->email)->delete();
            DB::table('audit_logs')->insert(['actor_id' => $u->id, 'subject_id' => $u->id, 'action' => 'password.changed', 'metadata' => json_encode(['source' => $sessionId ? 'web' : 'native']), 'created_at' => now()]);

            return $u;
        });
        if ($web) {
            Auth::guard('web')->setUser($u);
            $r->session()->regenerate(true);
            $r->session()->regenerateToken();
        }

        return response()->noContent();
    }

    public function reset(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'token' => 'required|string', 'password' => ['required', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers()]]);
        $status = Password::reset($d, function (User $u, string $password) {
            DB::transaction(function () use ($u, $password) {
                $u->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                $u->tokens()->delete();
                DB::table('sessions')->where('user_id', $u->id)->delete();
            });
            event(new PasswordReset($u));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'Tautan tidak valid atau kedaluwarsa.']);
        }

        return ['message' => 'Kata sandi diperbarui. Silakan masuk kembali.'];
    }

    public function sessions(Request $r)
    {
        return ['data' => DB::table('sessions')->where('user_id', $r->user()->id)->orderByDesc('last_activity')->get(['id', 'user_agent', 'last_activity'])->map(fn ($s) => ['id' => $s->id, 'user_agent' => $s->user_agent, 'last_activity' => $s->last_activity, 'current' => $s->id === $r->session()->getId()])];
    }

    public function revokeSession(Request $r, string $id)
    {
        DB::table('sessions')->where('user_id', $r->user()->id)->where('id', $id)->delete();
        if ($id === $r->session()->getId()) {
            return $this->logout($r);
        }

        return response()->noContent();
    }

    public function nativeLogin(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string', 'device_name' => 'required|string|max:80']);
        [$u, $token] = DB::transaction(function () use ($d) {
            // Serialize credential checks/token issuance with password rotation.
            $u = User::where('email', Str::lower($d['email']))->lockForUpdate()->first();
            if (! $u || ! Hash::check($d['password'], $u->password)) {
                throw ValidationException::withMessages(['email' => 'Email atau kata sandi tidak sesuai.']);
            }

            return [$u, $u->createToken($d['device_name'], ['campus'], now()->addDays(30))->plainTextToken];
        });
        $r->setUserResolver(fn () => $u);

        return ['data' => ['user' => new UserResource($u), 'token' => $token]];
    }

    public function nativeLogout(Request $r)
    {
        $token = $r->user()->currentAccessToken();
        abort_unless($token instanceof PersonalAccessToken, 400);
        $token->delete();

        return response()->noContent();
    }
}
