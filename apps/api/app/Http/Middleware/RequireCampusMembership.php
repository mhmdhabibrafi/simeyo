<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class RequireCampusMembership
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->hasVerifiedEmail() && $request->user()->verification_state === 'approved' && $request->user()->affiliation, 403, 'Verifikasi email dan afiliasi kampus diperlukan.');
        if ($request->user()->currentAccessToken() instanceof PersonalAccessToken) {
            abort_unless($request->user()->tokenCan('campus'), 403);
        }

        return $next($request);
    }
}
