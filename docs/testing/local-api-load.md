# Bounded local API sampler

Run `node infrastructure/scripts/benchmark-local-api.mjs` with `BENCH_EMAIL` and `BENCH_PASSWORD` supplied through the process environment for an existing, approved local test account. Do not put passwords in arguments or commit reports containing credentials. `BENCH_ORIGIN` defaults to `http://localhost:8000`; only loopback origins are accepted.

Defaults: 80 requests, four concurrent workers, ten-second request timeouts. `BENCH_REQUESTS` is limited to 5–200; `BENCH_CONCURRENCY` is limited to 1–8. It reads health, campus/following feeds, Pulse and activity. It creates one scoped native token and revokes only that token afterward; it does not publish posts, messages or alter profiles/browser sessions. A failed cleanup is reported explicitly. Responses and tokens are not included in the report.

The JSON report contains actual duration, throughput, HTTP status/error counts and per-endpoint p50/p95/max response time. Non-200 responses and unconfirmed token revocation produce a failing exit code. Do not disable application rate limits to make this check pass.

This is a reproducible local smoke/load sample, not a production capacity claim. The PHP local HTTP server serializes requests; PostgreSQL data size, cold/warm caches and concurrent manual use affect the result. Production load acceptance still requires a representative dataset, PHP-FPM/real worker topology, explicit latency/error objectives, sustained traffic, realtime/queue/media tests and resource monitoring in an isolated staging environment.

## Recorded runs, 2026-10-15

- [Windows local PHP server](results/local-api-2026-10-15.json): 80 requests, concurrency four, zero failures, 53.08 seconds, 1.51 requests/second, endpoint p95 2968–3689 ms. The scoped benchmark token was revoked. The database contained existing fictional test feeds.
- [Isolated HTTPS/FPM CI stack](results/ci-https-api-2026-10-15.json): 80 requests, concurrency four, zero failures, 1.62 seconds, 49.48 requests/second, endpoint p95 179–314 ms. The scoped token was revoked. This run used a small, freshly seeded CI database and verified TLS trust with an ephemeral test certificate. [Source run](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38689917319).

These datasets, hosts and HTTP server topologies differ. Do not report their ratio as an application optimization gain or extrapolate either result to real campus traffic.

## Seeded sustained CI workload

`load-production-stack.mjs` is restricted to disposable GitHub CI and the fixed loopback HTTPS gateway. It runs for 120 seconds with four fictional accounts, a target of eight requests/second and at most eight in flight. The fixture contains 100 additional users, 5,000 root posts, 500 replies/reactions, accepted follows, private profiles, blocks and mutes. Campus/Following/For You feeds, Pulse, search and activity are read through the real API; authentication throttles remain enabled. Acceptance requires zero failures, at least 864 completed requests (90% of the offered target) and endpoint p95 at most 2,000 ms. Only its own four newly created tokens are revoked afterward. The wrapper records EXPLAIN ANALYZE/BUFFERS and periodic container CPU/memory samples.

The [first seeded sample](results/ci-load-before-jit-tuning-2026-10-15.json) failed its latency budget: 260 requests, zero HTTP errors, 123.33 seconds and endpoint p95 2,415–5,702 ms. The inspected feed query spent 1,297.389 ms in JIT compilation out of 1,318.31 ms execution. JIT is now off for application connections, preserving the server-wide setting; image/runtime packages also changed between runs.

The [tuned sample](results/ci-load-after-jit-tuning-2026-10-15.json) passed: 960 requests, zero failures, 119.92 seconds, 8.01 requests/second and endpoint p95 113–328 ms. The feed plan executed in 13.383 ms with no JIT section, and token cleanup confirmed 4/4. [Source CI run](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38697903791). This is a reproducible synthetic staging workload, not a limit test, long-duration soak, provider benchmark or evidence of capacity for an entire campus. Real staging objectives and operator resource/alert budgets remain required.
