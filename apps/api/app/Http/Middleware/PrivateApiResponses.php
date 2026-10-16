<?php

namespace App\Http\Middleware;

use App\Services\ErrorSignals;
use Closure;
use Illuminate\Http\Request;

class PrivateApiResponses
{
    public function terminate($request, $response): void
    {
        try {
            app(ErrorSignals::class)->record($response->getStatusCode());
        } catch (\Throwable) { /* Monitoring must not change a completed response. */
        }
    }

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        if ($request->is('api/*') || $request->is('media/*')) {
            $response->headers->set('Cache-Control', 'private, no-store');
            $response->headers->set('X-Content-Type-Options', 'nosniff');
        }

        return $response;
    }
}
