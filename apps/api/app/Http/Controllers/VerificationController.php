<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\VerificationRequest;
use App\Services\CampusActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class VerificationController extends Controller
{
    public function show(Request $r)
    {
        return ['data' => $r->user()->verificationRequest?->only(['id', 'state', 'method', 'requested_affiliation', 'statement', 'review_note', 'reviewed_at'])];
    }

    public function store(Request $r)
    {
        $d = $r->validate(['requested_affiliation' => 'required|in:student,lecturer,alumni,organization_manager', 'method' => 'required|in:manual,institutional_email', 'statement' => 'required|string|min:20|max:1000']);
        $u = $r->user();
        abort_unless($u->hasVerifiedEmail() && $u->onboarded_at && $u->affiliation, 403, 'Selesaikan verifikasi email dan onboarding.');
        $verification = DB::transaction(function () use ($u, $d) {
            $u = User::whereKey($u->id)->lockForUpdate()->firstOrFail();
            abort_if(in_array($u->verification_state, ['approved', 'suspended'], true), 409, 'Status akun tidak mengizinkan pengajuan.');
            $existing = $u->verificationRequest;
            abort_if($existing?->state === 'pending', 409, 'Pengajuan sedang ditinjau.');
            $institution = $u->affiliation->institution;
            $emailEligible = $institution->email_auto_approval && in_array(strtolower(substr(strrchr($u->email, '@'), 1)), $institution->email_domains ?? [], true) && $d['requested_affiliation'] === 'student';
            if ($d['method'] === 'institutional_email') {
                abort_unless($emailEligible, 422, 'Domain email tidak dikonfigurasi untuk persetujuan otomatis.');
            }
            $state = $d['method'] === 'institutional_email' ? 'approved' : 'pending';
            $v = VerificationRequest::updateOrCreate(['user_id' => $u->id], $d + ['state' => $state, 'review_note' => null, 'reviewed_by' => null, 'reviewed_at' => $state === 'approved' ? now() : null]);
            $u->forceFill(['verification_state' => $state])->save();
            DB::table('audit_logs')->insert(['actor_id' => $u->id, 'subject_id' => $u->id, 'action' => 'verification.submitted', 'metadata' => json_encode(['method' => $d['method'], 'state' => $state]), 'created_at' => now()]);

            return $v;
        });

        return response()->json(['data' => $verification->only(['id', 'state', 'method', 'requested_affiliation'])], 201);
    }

    public function index(Request $r)
    {
        Gate::authorize('viewAny', VerificationRequest::class);

        return VerificationRequest::with('user:id,name,username')->when($r->user()->role !== 'super_administrator', fn ($q) => $q->whereHas('user.affiliation', fn ($a) => $a->where('institution_id', $r->user()->affiliation?->institution_id)))->orderByDesc('id')->paginate(20);
    }

    public function review(Request $r, VerificationRequest $verificationRequest)
    {
        Gate::authorize('update', $verificationRequest);
        $d = $r->validate(['state' => 'required|in:approved,rejected,suspended', 'review_note' => 'required|string|min:10|max:1000']);
        DB::transaction(function () use ($r, $verificationRequest, $d) {
            $v = VerificationRequest::whereKey($verificationRequest->id)->lockForUpdate()->firstOrFail();
            $u = User::whereKey($v->user_id)->lockForUpdate()->firstOrFail();
            abort_unless($u->hasVerifiedEmail(), 422, 'Pemilik akun belum memverifikasi email.');
            abort_unless($v->state === 'pending' || ($v->state === 'approved' && $d['state'] === 'suspended'), 409, 'Pengajuan sudah ditinjau.');
            $v->update($d + ['reviewed_by' => $r->user()->id, 'reviewed_at' => now()]);
            $u->forceFill(['verification_state' => $d['state']])->save();
            if ($d['state'] === 'approved') {
                $u->forceFill(['role' => $v->requested_affiliation])->save();
            }
            if ($d['state'] === 'suspended') {
                $u->tokens()->delete();
                DB::table('sessions')->where('user_id', $u->id)->delete();
            }
            DB::table('audit_logs')->insert(['actor_id' => $r->user()->id, 'subject_id' => $u->id, 'action' => 'verification.'.$d['state'], 'metadata' => json_encode(['request_id' => $v->id]), 'created_at' => now()]);
            app(CampusActivity::class)->send($u, $r->user(), 'verification', ['message' => 'Status afiliasi: '.$d['state'].'. '.$d['review_note']]);
        });

        return ['message' => 'Status verifikasi diperbarui.'];
    }
}
