# Release security review — 2026-10-15

Latest release-candidate evaluation and fresh dependency metadata: [2026-10-17 evidence](../testing/release-candidate-2026-10-17.md). Real campus-account/provider and physical-device acceptance remain open; older checkpoint counts below are historical.

This is an engineering review with recorded tests, not a completed production certification or an independent penetration test. v0.4.0/v1.0.0 acceptance remains open.

Latest follow-up evidence supersedes older counts below: 79 local backend tests / 522 assertions, successful PostgreSQL CI, 28 full browser tests and 3 focused privacy/messaging regressions. Cached conversations are hidden after access errors and cleared after blocking. The isolated sustained-load run completed 960 requests with zero failures and endpoint p95 67–193 ms; backup/media/key recovery passed in CI. See [exact source, deployment and testing scope](../testing/maturity-2026-10-15.md).

## Scope and evidence

- Reviewed the authentication/session boundary, campus and transitive content visibility, private media handling, notification filtering, push send/receipt lifecycle, native account/cache lifecycle, backup scripts, build context and new HTTPS/FPM release configuration.
- Full API regression including operational checks: **65 tests / 419 assertions**, SQLite memory and isolated PostgreSQL. The tests cover institutional boundaries, approval/roles, CSRF/session/native scopes, private accounts/communities, bilateral blocks, dependent content/media and moderation. Provider push HTTP is mocked.
- Database recovery drill passed in isolated CI: application user/profile/Unicode data and migration history restored; backup overwrite, nonempty/source target and invalid-archive checks rejected unsafe operations. Production media/key recovery is not covered.
- Production-shaped CI built and ran the PHP-FPM/OPcache, Next standalone, TLS Nginx, PostgreSQL, worker and Reverb topology. HTTPS login/logout, CSRF rejection, Secure/HttpOnly cookies, private response headers, feed and public realtime settings passed. See [CI evidence](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38689026253).
- Native lifecycle fixes bind asynchronous WebSocket authorization/errors to their original connection, ignore notification responses after effect cleanup, and avoid reopening an already handled retained push response. Profile permission errors hide cached profile data; blocking clears cached queries; optimistic interactions cancel feed/detail/Pulse refetches before updating. Unit/type/lint and Expo browser regression passed; physical-device races remain untested.
- Added private production env/config-cache exclusions to the Docker context. No application secrets are supplied at image build time. The release topology publishes only a loopback TLS gateway, uses a separate deployment namespace, and does not run migrations/seeders automatically.

## Dependency audit result

Fresh npm registry checks: **web production dependencies: zero advisory entries**; full web graph: **five high**; mobile graph: **18 high**, with no critical entries in these reports. Published `braces` remains 3.0.3 and `node-forge` remains 1.4.0. The compatible decoder/UUID overrides and their regression tests remain in place. No forced framework downgrade or advisory suppression was applied. See [dependency review](dependencies-2026-10-15.md) and [MOBILE.md](../../MOBILE.md).

These development/build-tooling advisories remain a release gate. A clean runtime-only web report does not establish a clean mobile graph or complete application security audit. Composer's earlier audit used cached metadata after a live refresh timeout. Latest full locked and no-dev locked audit commands both completed with no advisories or abandoned packages and no fallback warning. Fresh release/CI image HIGH/CRITICAL scanning now passed without suppression: https://github.com/mhmdhabibrafi/simeyo/actions/runs/38695738478; snapshot in docs/testing/results/image-audit-2026-10-15.json. API/web/Nginx/CI-PostgreSQL images had zero findings in those severities after removing unused build/runtime tooling and updating the base images. Lower severities and optional development images are outside that filtered result; no blanket zero-vulnerability claim is made.

## Open release gates

| Gate | Status / required evidence |
|---|---|
| Dependency remediation | Five web and 18 mobile high entries remain; recheck compatible upstream patches before release. |
| Native Android/iOS and push | Android and iOS simulator builds passed; Android partial installed-app checks passed but complete relaunch/profile acceptance remains open. iOS login UI retry is pending. Physical-device/push and store signing remain unverified. |
| Provider operations | Resend API verification/reset templates were accepted by its simulator and delivery is enabled. Real campus inbox/link acceptance, Expo/FCM/APNs credentials and push delivery remain unverified. Push stays disabled by default. |
| Full disaster recovery | Production media, encryption keys, retention, off-host copies, recovery-point/time objectives and operator cutover are not exercised. |
| Sustained performance | Seeded 120-second HTTPS/FPM CI read load passed 960 requests / zero errors / endpoint p95 113–328 ms; representative production scale, longer soak, resource budgets and external provider load remain unverified. |
| Production operations | Public domain/TLS, private WSS and worker health passed on the authorized server; stop/recovery detection passed in isolated CI. Agreed resource budgets, external alert routing and a complete operator cutover/rollback drill still require acceptance. |
| Account lifecycle | Define and implement the operator-approved retention/deletion process before broad campus rollout. |

The owner subsequently authorized a separate public web release-candidate installation on the Mediasi server; actual scope and limitations are recorded in [server operations](../operations/mediasi-server.md). No store submission or image publication was performed. Existing local data, application keys and demo passwords were preserved.
