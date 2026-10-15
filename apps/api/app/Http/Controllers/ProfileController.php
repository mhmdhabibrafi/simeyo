<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function me(Request $r)
    {
        return new UserResource($r->user()->load(['profile', 'affiliation.institution']));
    }

    public function show(Request $r, User $user)
    {
        app(PostVisibility::class)->assertProfile($r->user(), $user);

        return new UserResource($user->load(['profile', 'affiliation.institution']));
    }

    public function update(Request $r)
    {
        $u = $r->user();
        $d = $r->validate(['name' => 'sometimes|required|string|max:80', 'username' => ['sometimes', 'required', 'regex:/^[a-z0-9_]{3,24}$/', Rule::unique('users')->ignore($u->id)], 'bio' => 'nullable|string|max:500', 'location' => 'nullable|string|max:80', 'links' => 'sometimes|array|max:5', 'links.*' => 'required|url:http,https|max:255', 'interests' => 'sometimes|array|max:10', 'interests.*' => 'required|string|max:40', 'academic_visible' => 'sometimes|boolean', 'private_account' => 'sometimes|boolean']);
        DB::transaction(function () use ($u, $d) {
            DB::table('users')->where('id', $u->id)->lockForUpdate()->first();
            $u->update(array_intersect_key($d, array_flip(['name', 'username'])));
            $u->profile()->updateOrCreate([], array_diff_key($d, array_flip(['name', 'username'])));
        });

        return new UserResource($u->fresh(['profile', 'affiliation.institution']));
    }

    public function onboarding(Request $r)
    {
        $u = $r->user();
        abort_unless($u->hasVerifiedEmail(), 403, 'Verifikasi email terlebih dahulu.');
        $d = $r->validate(['institution_id' => 'required|exists:institutions,id', 'faculty_id' => ['nullable', Rule::exists('faculties', 'id')->where('institution_id', $r->input('institution_id'))], 'department_id' => ['nullable', Rule::exists('departments', 'id')->where('faculty_id', $r->input('faculty_id'))], 'academic_cohort_id' => ['nullable', Rule::exists('academic_cohorts', 'id')->where('institution_id', $r->input('institution_id'))]]);
        $d += ['faculty_id' => null, 'department_id' => null, 'academic_cohort_id' => null];
        DB::transaction(function () use ($u, $d) {
            $locked = User::whereKey($u->id)->lockForUpdate()->firstOrFail();
            abort_if(in_array($locked->verification_state, ['approved', 'suspended'], true), 409, 'Afiliasi terverifikasi tidak dapat diubah melalui onboarding.');
            abort_if($locked->verificationRequest()->exists(), 409, 'Afiliasi dikunci setelah pengajuan. Hubungi administrator untuk perubahan.');
            $locked->affiliation()->updateOrCreate([], $d);
            $locked->forceFill(['onboarded_at' => now()])->save();
        });

        return new UserResource($u->refresh());
    }
}
