# Simeyo implementation progress

Updated: 2026-10-15. The owner confirmed the application name **Simeyo** and authorized publication to https://github.com/mhmdhabibrafi/simeyo. The repository folder, database names, Compose volume namespace and session/storage identifiers retain compatibility with the existing workspace.

## Milestones

- v0.1.0 identity foundation: preserved and included in later regression tests.
- v0.2.0 social core: implemented and locally accepted. Text/image posts, nested threads, likes, reposts/quotes, follow requests, bookmarks, cursor feeds, profiles, optimistic UI, visibility, reports and private media use the real Laravel API/PostgreSQL.
- v0.3.0 campus experience: implemented and locally accepted. Communities/private memberships/roles, academic scopes, events/RSVP, Pulse/search, mentions/hashtags, recommendations, messages, preferences, persisted/realtime notifications and audited moderation are functional. Full browser regression passed 13 tests before Phase 4 additions.
- v0.4.0 mobile experience: IN PROGRESS. PWA production-browser acceptance passed again after the Simeyo rename (1 test / 16.9 seconds). Expo client source, native tabs, authentication, feed/composer, profiles, discovery, communities/events, activity, messages, themes and guarded push registration are implemented. Native device acceptance remains outstanding.
- v1.0.0 production readiness: NOT COMPLETE. No release tag or public application deployment.

## Fresh verification after the Simeyo rename

| Check | Actual result |
|---|---|
| Full API suite, SQLite memory | 61 passed / 406 assertions |
| Full API suite, isolated PostgreSQL `ruang_test` | 61 passed / 406 assertions |
| Shared contract tests | 3 passed |
| Web strict TypeScript and ESLint | Passed |
| Web production build | Passed; 27 routes including PWA manifest |
| Mobile app and test TypeScript | Passed |
| Mobile ESLint | Passed after browser-discovered rendering/accessibility fixes; final label-only adjustment also checked in the browser |
| Mobile pure client/dependency tests | 6 passed |
| Expo component browser acceptance | 1 passed / 1.4 minutes: native-scoped login, persisted post/like/profile, cross-account reads and dark theme |
| GitHub authentication | Connected as mhmdhabibrafi; initial push to origin/main succeeded (6bb47fa) |

Expo Doctor passed 21/21 checks. Metro Android/iOS/web export passed again after the Simeyo rename and browser fixes. Export used reserved placeholder HTTPS origins for compilation only and does not demonstrate production API connectivity or installed-device behavior. The PWA test proved real service worker registration, manifest validity, private API/no-store handling, exclusion of user data from caches, offline navigation and reconnect. PWA acceptance repeated successfully after branding changes.

## Database and security

All changes are additive migrations: identity; social core 100000; campus communications 200000; spaces 210000; indexed notification visibility 220000; encrypted push devices/receipts 300000; post retry identities 310000. Applied to project-local PostgreSQL. Existing posts were indexed without sending historical notifications.

Campus approval, institution boundaries, private audiences/community membership, transitive reply/quote visibility, bilateral blocks, token scopes and expiration are checked server-side. Private media is validated/reencoded and served through authorized routes. Native post/message UUIDs make retries idempotent. Push payloads are generic and recheck permission before delivery. Push provider HTTP was mocked in tests; no real FCM/APNs delivery is claimed.

## Infrastructure and unresolved release gates

- Native local PostgreSQL, Laravel, Reverb and queue-worker round trips were tested. Portable Compose v5.6.0 validates all profiles, but Docker Engine pipe is absent. Container startup, Redis, MinIO and Meilisearch runtime remain BELUM DIUJI.
- Web runtime-only npm audit reported zero advisories. Full web audit retains five high development-tooling entries in an upstream unpatched braces chain.
- Expo-compatible updates and tested decoder/UUID overrides reduced mobile findings from 28 to 18 high entries. Remaining braces/node-forge tooling chains have no compatible published fix at last check. Do not downgrade SDK or report the audit clean.
- Composer audit reported no advisories from cached metadata after live Packagist refresh timed out; this is not a fresh online audit.
- Android SDK/JDK/adb were not detected. Expo Android prebuild passed; generated manifest/app ID/scheme checked. Gradle failed because JAVA_HOME/java are absent. No APK, installed Android app, iOS build, physical-device secure storage or push delivery acceptance yet. No cloud build/store submission.
- Production SMTP, HTTPS/proxy policy, production object storage, supervised workers, real-device credentials, load acceptance, backup/restore drill and full production deployment configuration remain release work.
- New app IDs are `app.simeyo.mobile`, URI scheme `simeyo`, slug `simeyo`. Never rename/drop the existing PostgreSQL database or regenerate application keys to change branding.

## Resume commands and remaining work

Use README and MOBILE.md. Start local DB/API/web via `npm.cmd run dev:db`, `npm.cmd run dev:api`, `npm.cmd run dev:web`; realtime via `dev:reverb` and `dev:worker`. Credentials are ignored in local environments and must not be committed.

Expo browser acceptance and repeat production PWA acceptance passed; actual native feed/dark settings screenshots were inspected. Android configuration was generated with Expo prebuild and checked; Gradle is blocked by absent Java. Next web typecheck now generates route types explicitly for clean checkouts; PHPUnit only lists the existing Feature suite. First GitHub run passed mobile and exposed these two clean-checkout configuration issues. Both were fixed; subsequent GitHub CI passed API, web and mobile on commit 250ee01. Evidence: https://github.com/mhmdhabibrafi/simeyo/actions/runs/38678490707. CI used its own PostgreSQL 17 service; this does not verify the local Compose stack. Continue production security/performance/load/backup checks, update documentation with actual evidence, and keep the authorized repository synchronized. Preserve existing features/data; never mark untested release gates complete.
