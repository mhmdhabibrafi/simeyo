# Bounded local API sampler

Run `node infrastructure/scripts/benchmark-local-api.mjs` with `BENCH_EMAIL` and `BENCH_PASSWORD` supplied through the process environment for an existing, approved local test account. Do not put passwords in arguments or commit reports containing credentials. `BENCH_ORIGIN` defaults to `http://localhost:8000`; only loopback origins are accepted.

Defaults: 80 requests, four concurrent workers, ten-second request timeouts. `BENCH_REQUESTS` is limited to 5–200; `BENCH_CONCURRENCY` is limited to 1–8. It reads health, campus/following feeds, Pulse and activity. It creates one scoped native token and revokes only that token afterward; it does not publish posts, messages or alter profiles/browser sessions. A failed cleanup is reported explicitly. Responses and tokens are not included in the report.

The JSON report contains actual duration, throughput, HTTP status/error counts and per-endpoint p50/p95/max response time. Non-200 responses and unconfirmed token revocation produce a failing exit code. Do not disable application rate limits to make this check pass.

This is a reproducible local smoke/load sample, not a production capacity claim. The PHP local HTTP server serializes requests; PostgreSQL data size, cold/warm caches and concurrent manual use affect the result. Production load acceptance still requires a representative dataset, PHP-FPM/real worker topology, explicit latency/error objectives, sustained traffic, realtime/queue/media tests and resource monitoring in an isolated staging environment.
