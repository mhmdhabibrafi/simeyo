<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\Institution;
use App\Models\User;
use App\Services\FirebaseIdentity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FirebaseAuthController extends Controller
{
    public function login(Request $request, FirebaseIdentity $firebase)
    {
        $data = $request->validate(['firebase_token' => 'required|string|max:16384']);
        $identity = $firebase->verify($data['firebase_token']);
        $user = DB::transaction(function () use ($identity) {
            $institution = Institution::where('slug', config('firebase.institution_slug'))->firstOrFail();
            $binding = DB::table('firebase_identities')->where('project_id', config('firebase.project_id'))->where('firebase_uid', $identity['uid'])->first();
            $user = User::where('email', $identity['email'])->lockForUpdate()->first();
            abort_if($binding && (! $user || $binding->user_id !== $user->id), 403, 'Identitas Google tidak cocok.');
            abort_if($user && in_array($user->verification_state, ['suspended', 'rejected'], true), 403, 'Akun memerlukan tinjauan administrator.');
            if (! $user) {
                abort_unless(config('registration.enabled'), 503, 'Pendaftaran belum dibuka.');
                $user = User::create(['email' => $identity['email'], 'name' => $identity['name'], 'username' => 'kampus_'.Str::lower(Str::random(12)), 'password' => Str::random(64)]);
                $user->profile()->create([]);
            }
            abort_if($user->affiliation && $user->affiliation->institution_id !== $institution->id, 403, 'Afiliasi berbeda memerlukan tinjauan administrator.');
            $existing = DB::table('firebase_identities')->where('user_id', $user->id)->first();
            abort_if($existing && ($existing->firebase_uid !== $identity['uid'] || $existing->project_id !== config('firebase.project_id')), 403, 'Akun telah terhubung ke identitas berbeda.');
            if (! $existing) {
                // An unverified password account may have been created by someone else.
                // Proof of Google email ownership must invalidate those credentials.
                if (! $user->hasVerifiedEmail()) {
                    $user->forceFill(['password' => Str::random(64), 'remember_token' => Str::random(60)]);
                    $user->tokens()->delete();
                    DB::table('sessions')->where('user_id', $user->id)->delete();
                    DB::table('password_reset_tokens')->where('email', $user->email)->delete();
                }
                DB::table('firebase_identities')->insert(['user_id' => $user->id, 'project_id' => config('firebase.project_id'), 'firebase_uid' => $identity['uid'], 'campus_category' => $identity['category'], 'created_at' => now(), 'updated_at' => now()]);
                DB::table('audit_logs')->insert(['actor_id' => $user->id, 'subject_id' => $user->id, 'action' => 'verification.firebase-google', 'metadata' => json_encode(['campus_category' => $identity['category']]), 'created_at' => now()]);
            }
            if (! $user->affiliation) {
                $user->affiliation()->create(['institution_id' => $institution->id]);
            }
            $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now(), 'verification_state' => 'approved', 'onboarded_at' => $user->onboarded_at ?? now()])->save();

            return $user;
        });
        Auth::guard('web')->login($user);
        $request->session()->regenerate(true);
        $request->session()->put('password_hash_web', Auth::guard('web')->hashPasswordForCookie($user->getAuthPassword()));

        return (new UserResource($user))->response()->setStatusCode(200);
    }
}
