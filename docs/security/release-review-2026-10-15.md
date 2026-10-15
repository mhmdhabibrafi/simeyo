# Release security review — 2026-10-15

This is an engineering review with recorded tests, not a completed production certification or an independent penetration test. v0.4.0/v1.0.0 acceptance remains open.

## Scope and evidence

- Reviewed the authentication/session boundary, campus and transitive content visibility, private media handling, notification filtering, push send/receipt lifecycle, native account/cache lifecycle, backup scripts, build context and new HTTPS/FPM release configuration.
- Full API regression after the additive push indexes: **61 tests / 406 assertions**, SQLite memory and isolated PostgreSQL. The tests cover institutional boundaries, approval/roles, CSRF/session/native scopes, private accounts/communities, bilateral blocks, dependent content/media and moderation. Provider push HTTP is mocked.
- Database recovery drill passed in isolated CI: application user/profile/Unicode data and migration history restored; backup overwrite, nonempty/source target and invalid-archive checks rejected unsafe operations. Production media/key recovery is not covered.
- Production-shaped CI built and ran the PHP-FPM/OPcache, Next standalone, TLS Nginx, PostgreSQL, worker and Reverb topology. HTTPS login/logout, CSRF rejection, Secure/HttpOnly cookies, private response headers, feed and public realtime settings passed. See [CI evidence](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38689026253).
- Native lifecycle fixes bind asynchronous WebSocket authorization/errors to their original connection, ignore notification responses after effect cleanup, and avoid reopening an already handled retained push response. Profile permission errors hide cached profile data; blocking clears cached queries; optimistic interactions cancel feed/detail/Pulse refetches before updating. Unit/type/lint and Expo browser regression passed; physical-device races remain untested.
- Added private production env/config-cache exclusions to the Docker context. No application secrets are supplied at image build time. The release topology publishes only a loopback TLS gateway, uses a separate deployment namespace, and does not run migrations/seeders automatically.

## Dependency audit result

Fresh npm registry checks: **web production dependencies: zero advisory entries**; full web graph: **five high**; mobile graph: **18 high**, with no critical entries in these reports. Published `braces` remains 3.0.3 and `node-forge` remains 1.4.0. The compatible decoder/UUID overrides and their regression tests remain in place. No forced framework downgrade or advisory suppression was applied. See [dependency review](dependencies-2026-10-15.md) and [MOBILE.md](../../MOBILE.md).

These development/build-tooling advisories remain a release gate. A clean runtime-only web report does not establish a clean mobile graph, image scan or complete application security audit. Composer's earlier audit used cached metadata after a live refresh timeout; a fully fresh Composer/image audit is still required.

## Open release gates

| Gate | Status / required evidence |
|---|---|
| Dependency remediation | Five web and 18 mobile high entries remain; recheck compatible upstream patches before release. |
| Native Android/iOS and push | Android development APK build is being attempted in CI. No physical-device session/media/push acceptance, store signing or iOS installed-build acceptance. |
| Provider operations | Real SMTP, Expo/FCM/APNs credentials and push delivery are not verified. Push stays disabled by default. |
| Full disaster recovery | Production media, encryption keys, retention, off-host copies, recovery-point/time objectives and operator cutover are not exercised. |
| Sustained performance | The 80-request samples are bounded baselines, not representative staging load or capacity acceptance. |
| Production operations | Actual domain/certificates, least-privilege database roles, resource budgets, monitoring/alerting, rollback and private WebSocket delivery through the TLS gateway require acceptance. |
| Account lifecycle | Define and implement the operator-approved retention/deletion process before broad campus rollout. |

No public deployment, store submission or image publication was performed. Existing local data, application keys and demo passwords were preserved.
