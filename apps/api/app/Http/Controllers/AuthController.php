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
    public function register(Request $r)
    {
        $r->merge(['email' => Str::lower((string) $r->input('email')), 'username' => Str::lower((string) $r->input('username'))]);
        $data = $r->validate(['name' => 'required|string|max:80', 'username' => 'required|string|regex:/^[a-z0-9_]{3,24}$/|unique:users', 'email' => 'required|email|max:254|unique:users', 'password' => ['required', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers()]]);
        $u = DB::transaction(function () use ($data) {
            $u = User::create($data);
            $u->profile()->create([]);

            return $u;
        });
        event(new Registered($u));
        Auth::login($u);
        $r->session()->regenerate();

        return (new UserResource($u->refresh()))->response()->setStatusCode(201);
    }

    public function login(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        if (! Auth::attempt(['email' => Str::lower($d['email']), 'password' => $d['password']])) {
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi tidak sesuai.']);
        }
        $r->session()->regenerate();

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
        $d = $r->validate(['email' => 'required|email']);
        Password::sendResetLink(['email' => Str::lower($d['email'])]);

        return ['message' => 'Jika email terdaftar, tautan pemulihan akan dikirim.'];
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
        $u = User::where('email', Str::lower($d['email']))->first();
        if (! $u || ! Hash::check($d['password'], $u->password)) {
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi tidak sesuai.']);
        }
        $r->setUserResolver(fn () => $u);

        return ['data' => ['user' => new UserResource($u), 'token' => $u->createToken($d['device_name'], ['campus'], now()->addDays(30))->plainTextToken]];
    }

    public function nativeLogout(Request $r)
    {
        $token = $r->user()->currentAccessToken();
        abort_unless($token instanceof PersonalAccessToken, 400);
        $token->delete();

        return response()->noContent();
    }
}
