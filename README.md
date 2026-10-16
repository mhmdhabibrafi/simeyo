# Simeyo

Latest DM recipient fix and Explore/settings polish: [verified deployment](docs/testing/discovery-2026-10-16.md).


Latest activity/search/DM acceptance: [2026-10-16 report](docs/testing/activity-search-messaging-2026-10-16.md). Physical-device keyboard and OS installation remain untested; browser acceptance is recorded separately.


**Satu kampus. Banyak cerita.**

Profile update: compact identity metadata, accessible profile tabs and a redesigned editor with dedicated photo controls, sticky saving, field feedback and unsaved-change confirmation. Photos save independently of text. See [profile verification](docs/testing/profile-2026-10-16.md).

Feed/draft update: local text/audience recovery, account/context separation and logout cleanup; stable home reading with a user-controlled new-story notice and connection feedback. Photos must be selected again after reopening. See [implementation and actual checks](docs/testing/feed-drafts-2026-10-16.md).

Photo viewer update: previous/next attachment controls, position counts, keyboard navigation and restored dialog focus. See [verification and deployment](docs/testing/gallery-2026-10-16.md).

Experience update: sent/read chat checks, automatic Activity read, an install offer when the browser supports it, flexible image counts, swipe galleries and reduced-motion-aware loading/transitions. Transport uploads support 64 MB per file; image format/dimension and rate protections remain. Exact implementation and test scope: [experience evidence](docs/testing/experience-2026-10-16.md).

Latest UI corrections include consistent form fields, compact mobile spacing, a full-width composer toolbar and bounded chat sizing. Earlier verification: [layout evidence](docs/testing/layout-2026-10-16.md).

Latest deployed application source e4bbb57 adds chat read receipts, automatic Activity read, a browser-supported PWA offer and flexible galleries. Settings group account/campus, appearance, privacy and expandable device/install controls; `/verification` redirects into Settings. Community/Events shortcuts display "Segera hadir". See [experience evidence](docs/testing/experience-2026-10-16.md) and [earlier posting/settings evidence](docs/testing/posting-flow-2026-10-16.md).

Current locally verified milestone: **v0.3.0 — campus experience**. The Expo/PWA v0.4.0 milestone and v1.0.0 production review remain in progress.

The authorized server release candidate is available at **https://simeyo.mhmdhabibrafi.me**. There is no marketing landing page: `/` opens the feed and signed-out visitors continue to login. Firebase Google campus sign-in is deployed; real Google campus-account acceptance is pending Firebase Console setup/testing. Password registration creates pending accounts. Verification/recovery email is enabled through the Resend HTTPS API; provider simulator acceptance passed, while real campus inbox delivery remains untested. See [email evidence](docs/testing/resend-2026-10-15.md), [authentication](AUTHENTICATION.md) and [server operations and verified scope](docs/operations/mediasi-server.md); public availability does not mark v1.0.0 acceptance complete.

The consumer layout has a centered feed, one account menu at the bottom of the desktop sidebar, a modal composer and a two-panel inbox. Latest refinements include message previews, reader-aware scrolling, cached-access protection and clearer campus screens. See [maturity and production-check evidence](docs/testing/maturity-2026-10-15.md) and [earlier UI evidence](docs/testing/consumer-ui-2026-10-15.md); fixture visual checks and real API acceptance are identified separately.

Social features use the Laravel API and PostgreSQL: text/images, nested threads, interactions, follows/private requests, bookmarks and cursor feeds. Campus modules include communities/events, Pulse/search, messaging, notifications and moderation. See [campus architecture](docs/architecture/campus-experience.md) and [mobile implementation and limits](MOBILE.md).

For local realtime, additionally run `npm.cmd run dev:reverb` and `npm.cmd run dev:worker`. Local services and the separate production-shaped HTTPS/FPM Docker stack were tested. Redis, Mailpit, optional S3 storage and search service protocols also passed in isolated Docker CI; this Windows host still has no Docker Engine. To enable development Compose realtime, set `BROADCAST_CONNECTION=reverb` in the local root environment and enable both `workers` and `realtime` profiles. Existing credentials are preserved by `setup:env`.

An independent, verified campus community platform, initially configured for UIN Sultan Syarif Kasim Riau. No official university endorsement, SSO integration or access to university student records is implied.

The platform combines Next.js web, Laravel/Sanctum API, PostgreSQL and an Expo React Native client. Identity, social and campus acceptance tests passed locally; PWA production-browser acceptance passed. Native device and production acceptance remain pending. See [PROGRESS.md](PROGRESS.md) for actual implementation and test evidence.

The application was renamed to **Simeyo** at the owner's request. Existing database names, Compose volume namespace and session/storage keys retain their previous internal identifiers to preserve local data and active sessions. The repository directory can remain `D:\ruang-simed`.

## Start locally on Windows

Requirements: Node 24, PHP 8.2 with PDO, PostgreSQL extension, GD, mbstring and Composer. The included local PostgreSQL helper does not use any other project's database.

```powershell
npm.cmd ci
npm.cmd --prefix apps/web ci
composer install --working-dir=apps/api
npm.cmd run setup:env
npm.cmd run dev:db
```

Keep the database terminal open. In another terminal:

```powershell
cd apps/api
php -d extension=pdo_pgsql artisan migrate
php -d extension=pdo_pgsql artisan db:seed --class=DevelopmentSeeder
cd ../..
npm.cmd run dev:api
```

In a third terminal:

```powershell
npm.cmd run dev:web
```

Open **http://localhost:3000**. API health: http://localhost:8000/api/v1/health. Use `localhost` consistently: mixing it with `127.0.0.1` in browser URLs breaks cookie origins.

Development-only fictional accounts: `nadia@example.test`, `rafi@example.test`, `admin@example.test`. Their shared **random** local password is `DEMO_PASSWORD` in `apps/api/.env`; it is never committed or printed by setup. Alternatively register a new account. Default mail transport is log; the signed verification/recovery link is in `apps/api/storage/logs/laravel.log`. Docker includes Mailpit for development email.

## Verify

```powershell
npm.cmd run test:api
npm.cmd run test:postgres
npm.cmd --prefix apps/web run lint
npm.cmd --prefix apps/web run typecheck
npm.cmd run build:web
npx.cmd --prefix apps/web playwright install chromium
npm.cmd --prefix apps/web run test:e2e
npm.cmd run contracts
```

The PostgreSQL test runner only targets `ruang_test`; SQLite tests use memory. Browser tests require the development servers and development seeder, create fictional `e2e_*` accounts and modify a demo profile. Do not run them against production.

See [INSTALLATION.md](INSTALLATION.md), [AUTHENTICATION.md](AUTHENTICATION.md), [API.md](API.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md), and [DATABASE.md](DATABASE.md).

Release preparation: [HTTPS/FPM/standalone configuration](infrastructure/production/README.md), [database backup and restore](docs/operations/backup-restore.md), and [bounded local load sampler](docs/testing/local-api-load.md). These checks do not declare production readiness or deploy the application.

Latest release work includes a real private WebSocket round trip through the TLS gateway, database/private-media/encryption recovery, a redacted [database/worker operational check](docs/operations/monitoring.md), full isolated browser regression and HIGH/CRITICAL image scanning. External push credentials are not available, as confirmed by the owner; physical push acceptance remains open. See PROGRESS.md for run links and current native/load status.
