# Posting flow and settings consolidation — 2026-10-16

Application source: **b2e7e3f**. Existing Laravel persistence, media authorization and PostgreSQL contracts are unchanged.

## Behavior

- Web posting now sends the API's existing `client_id`. An unchanged failed submission reuses its UUID; changing the payload generates another UUID. Successful submissions clear it. This also applies to replies and quotes through the shared composer. The backend already enforces per-author retry identity, content matching and attached-media retries.
- Uploads show file-by-file progress, not a fabricated byte percentage. If a batch fails partway, completed previews stay attached; the remaining files stay in memory with explicit retry/cancel controls. Posting is disabled until those files are uploaded or canceled. Retrying sends only the remaining files. Deleting a successful attachment still uses the existing authorized API.
- File type and 4 MB size checks provide early feedback. Server-side MIME, dimensions, ownership and size validation remain authoritative. Adding more files is disabled at four attachments and while a failed batch awaits a decision.
- Text stays intact after upload/post errors. Refresh/close triggers the browser's unsaved-work warning when supported. This does not persist drafts across a browser crash or guarantee interception of client-side navigation.
- Opening an unread notification invokes the existing mark-read API while navigating to its conversation/thread/profile. Verification notifications use the verification page. The separate mark-read button remains available; failures still produce an error toast.

## Actual local verification

- Web lint/type checking and production build passed. No dependencies were added.
- **15 presentation/browser tests passed (57.8 seconds)** with fictional API responses. The full regression includes the new partial-upload, invalid-file and notification-to-reply flows plus existing feed/privacy/error/mobile/accessibility checks.
- After the final form guard refinement, **4 focused tests passed (13.3 seconds)** on the rebuilt production server. Includes unchanged retry UUID reuse, changed-payload UUID replacement, successful-preview retention, remaining-file retry, oversized-file rejection, failed-upload cancellation without losing text, notification mark-read/navigation and reply feed refresh.
- **25 backend tests / 214 assertions passed (5.536 seconds)** for SocialCoreTest and CommunicationsTest against an explicitly isolated in-memory SQLite database. Includes actual persisted post/media retry identity, nested replies and private notifications. No production database or user account was used.
- Fresh mobile failed-upload screenshot was inspected: `screenshots/composer-upload-retry.png`.

## CI and deployment checkpoint

Previous layout source 42c3c4d completed both [standard CI](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38774732396) and [real-API privacy/messaging acceptance](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38774751829) successfully. These are prior-source evidence.

The b2e7e3f [standard CI](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38780809950) completed successfully across all four jobs. The b2e7e3f [real-API privacy/messaging acceptance](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38780811721) also passed: one communications test (8.5 seconds) and two social/privacy tests (17.1 seconds). These are exact-source results for the posting change, not later settings revisions.

Both image types built successfully as `flow-b2e7e3f`; only web/gateway were recreated. API/worker/Reverb retain `maturity-578e8af`, with unchanged API logic. PostgreSQL/media volumes, application keys and Firebase/Resend settings were preserved. A private environment rollback snapshot and previous images remain available. No migrations, seeding or production account mutation occurred.

**15 public-assets browser tests passed (50.8 seconds)** on the deployed version, using fictional API fixtures. The final failed-upload screenshot was visually inspected. These exercise actual deployed JavaScript/CSS without using real production accounts; they are distinct from the real-API CI suite.

Trusted internal post-deployment checks passed: root/login/manifest/API health 200, anonymous account endpoint 401, private paths 404, CSRF bootstrap 204, missing-CSRF auth writes 419, verified TLS and actual WSS handshake.

Real campus Google/inbox acceptance, physical mobile keyboard/push acceptance and the existing production recovery gates remain **BELUM DIUJI**. File queues and retry identities last for the mounted composer; durable account-scoped draft recovery is not implemented by this change.

## Owner-requested coming-soon shortcuts

Follow-up source **9a9b991** labels the Explore Community and Events cards **Segera hadir**, disables them and removes the navigation arrows. The Requests shortcut remains active. Existing routes, APIs and data were preserved. Web lint/type checking/build passed; the focused Explore test passed locally (6.6 seconds), covering 1440/390/320px, both themes, search/people interactions and accessibility. Screenshots were inspected. Broader b2e7e3f CI evidence above predates this small presentation-only follow-up; no extra full CI run is claimed for 9a9b991.

## Settings consolidation requested during this work

Source **fb94389** combines verification with account settings. `/verification` redirects to `/settings#account-campus`; registration, onboarding, restricted-feed links and verification notifications use the new destination directly. The separate verification menu item was removed. Approved accounts see only a compact campus status; pending/rejected users keep the email, onboarding and review flows. Failed review-status loading is retryable and does not expose a submit form until the status is known.

Settings now use consistent grouped rows for account/campus, appearance and privacy. Active sessions and app installation expand on demand. Session confirmation/revocation, theme, privacy explanation and PWA controls remain available. Registration/onboarding and device-session browser callers were updated to the new UI.

Web lint/type checking/build passed. **17 local fixture browser tests passed (58.4 seconds)**, including new approved/pending settings cases, legacy redirect, session confirmation, retry of failed status loading and submitting a pending request. A screenshot-only follow-up reran the settings test successfully (11.9 seconds) after returning to the page top for clear captures. Fresh 320/390/1440px light/dark screenshots were inspected.

The fb94389 [full browser run](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38782199531) and [standard CI](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38782197135) are still running at this checkpoint. Their results are not inferred from b2e7e3f.

Follow-up verification: fb94389 standard CI completed successfully across all four jobs. The full browser run failed in the foundation acceptance after administrator approval because its final assertion still expected the removed heading "Afiliasi disetujui". The new settings UI and earlier API authorization checks were not inferred as failed from that stale label. Source **eda3bed** updates the assertion to the compact "Kampus terverifikasi" status, checks the settings URL and absence of completed verification controls. It also gives the disposable CI PostgreSQL health probe an explicit database/user instead of the nonexistent default root role. No production application code or database was changed by this follow-up. Playwright discovery resolves 35 tests in 11 files; discovery alone is not an execution result. Rerun [38847456996](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38847456996) is pending until actual completion.

The eda3bed [standard CI 38847456145](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38847456145) passed all four jobs. Fresh isolated sustained-read load measured **960 requests, zero failures, 119.92 seconds**, with six endpoint p95 values ranging **52–136 ms**. This is isolated CI evidence, not a campus-scale production load claim. Current server read-only HTTPS/security/health and WSS handshake checks also passed; all application containers were running and PostgreSQL was healthy. Existing `settings-fb94389` web images remain active because this follow-up changes no application runtime files.

### Completed full browser rerun

[Full browser 38847456996](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38847456996) on **eda3bed** completed successfully: **35 tests passed across 11 files**. Counts from the actual log: public accessibility 1, account security 5, campus 1, communications 1, fixture presentation 17, foundation 4, media/pagination 1, moderation 1, authenticated accessibility 1, session/media 1 and social/privacy 2. These include real API/PostgreSQL/realtime flows and explicitly fictional UI fixtures; they are not 35 production-account tests.

The corrected foundation flow passed all four tests (9.8 seconds), including signed email verification, onboarding, administrator approval, the compact campus status in Settings and actual campus API access. Authenticated accessibility, session revocation, stored media and social/privacy flows that had not run after the earlier failure now also passed. The original failed run remains recorded above; these completed results supersede the pending rerun checkpoint. Physical-device/push, real campus Google/inbox and production recovery gates remain open as previously documented.

Both image types built as `settings-fb94389`; only web/gateway were recreated. API/worker/Reverb remain `maturity-578e8af`. The intermediate `flow-9a9b991` images were built but were not activated separately; the final settings deployment includes those changes. Private rollback configuration/images and existing database/media/credentials were retained. Trusted internal TLS/security/health and actual WSS handshake passed after this deployment. No production migration, seed or user mutation accompanied it.

**All 17 public-assets UI tests passed (1.2 minutes, as reported by Playwright)** on settings-fb94389. Includes the final settings/legacy redirect, pending review, session revocation, coming-soon Explore and posting/upload/notification flows. These use fictional API fixtures with deployed assets; production accounts were not impersonated. Fresh mobile dark and desktop light settings screenshots were inspected. Full real-API CI remains separately tracked above.
