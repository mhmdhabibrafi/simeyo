# Changelog

- Correct missing shared form styling, bounded chat viewport sizing, nested navigation selection and mobile feed spacing. Use a mobile composer sheet with one full-width action row; clarify empty conversations and hide irrelevant read controls. Source 42c3c4d deployed; 12 local and 12 public-assets fixture UI checks passed. See docs/testing/layout-2026-10-16.md for scope and pending CI.

- Removed the feed explanation strip and duplicate profile entry in the account menu. Profile remains available through the main desktop/mobile navigation.

- Consolidated desktop account controls into one menu at the bottom-left of the sidebar, opening upward. Navigation collapse lives in that menu and theme selection remains in Settings.

- Fixed the global focus rule overriding the composer textarea. Replaced its native audience select with a themed, keyboard-accessible radio menu; simplified the modal header and corrected follower-only visibility guidance.

### Consumer feed redesign and interaction fixes

- Centered feed with compact desktop navigation, a quieter post layout and a composer that expands while writing. Removed the oversized campus sidebar; academic information remains small metadata. Bookmarks, verification and moderation remain available in the account menu.
- Kept account controls reachable on short desktops and simplified narrow mobile headers. Logout is available through the account menu.
- Locked the draft during submission, preserved failed drafts, paused automatic pagination after a failed page, deduplicated overlapping cursor pages, and added keyboard navigation for feed tabs.
- Clear private query caches on successful password/Firebase account login so a prior account's cached feed is not reused.

- Removed the marketing landing page. `/` redirects to the feed; signed-out visitors continue to login. Login and registration now use a compact single-column layout.

### Firebase campus sign-in (pending production acceptance)

- Added Firebase Google web sign-in and Laravel session exchange with signed-token verification and exact campus domain allowlist. Student/staff membership metadata never grants administrator rights.
- Added protected identity bindings, account suspension checks and credential invalidation when linking previously unverified password accounts.
- Retained password login and pending registration; provider activation is explicit through API environment configuration. Real Google and native sign-in acceptance are not yet verified.

## Unreleased — v0.4.0 work in progress

- Add authenticated password changes in web/native settings with current-credential checks, transactionally revoked device sessions/tokens/reset links, rotated current web session and audit records. Enforce configurable exact campus registration domains without granting verification; expose honest registration/email availability in public forms.

- Replace purple branding with a monochrome light/dark palette across web and native themes, focus/navigation states, PWA metadata and generated icons. Preserve contrast on inverted buttons, hero artwork and native switches.

- Install the owner-authorized web release candidate on the existing Mediasi server with dedicated PostgreSQL/media volumes, restricted application database role and verified Cloudflare origin TLS. Public HTTPS/security/mobile login rendering and internal owner login/worker/WebSocket checks passed. Explicitly suspend email-dependent endpoints until SMTP is configured; preserve existing server applications and ingress entries.

- Add real private WSS gateway acceptance, isolated full browser regression, seeded sustained-load/query-plan/resource evidence and operational queue heartbeat checks (including stopped-worker detection/recovery).
- Disable PostgreSQL JIT per application connection after measured compilation overhead; honor database TLS/CA settings. Minimize PHP/Node release images and run CI PostgreSQL unprivileged; HIGH/CRITICAL image scanning passed without suppression.
- Exercise optional Redis/S3/search/Mailpit protocols in Docker CI. Build optional development MinIO from pinned official community source after public image pull failures; preserve existing local namespaces and volumes.
- Compile/install/launch the iOS simulator app, add native UI acceptance harnesses and reusable explicit build-artifact inputs. Native UI and physical push acceptance remain separate from compilation; production/preview mobile origin validation now covers both API and web.
- Extend isolated PostgreSQL recovery CI with profile-linked private media archive/content checksums, Laravel encrypted push-device recovery using a retained key, and wrong-key rejection. Production recovery remains a separate acceptance gate.
- Rename the application to **Simeyo** as confirmed by the owner; update web/native branding, application icons, manifests and API documentation. Preserve database, volume, credential and session identifiers for compatibility.
- Add a privacy-preserving PWA and Expo native client with scoped authentication, feeds, composer, profiles, activity, messaging, themes and guarded push registration.
- Add encrypted push-device registration, queued generic notifications/receipt checks and idempotent post retry identities. Push provider tests use mocked HTTP; physical delivery remains untested.
- API regression after these additions: **61 tests / 406 assertions passed** on SQLite and isolated PostgreSQL. Expo Android/iOS/web bundles exported successfully; compilation does not prove installed-device behavior.
- PWA production-browser acceptance passed after the rename; Expo component browser acceptance also passed. Isolated HTTPS/FPM/standalone Docker smoke acceptance now passes; local supporting Docker services and production readiness remain pending.

- Add guarded PostgreSQL archive backup/restore with actual isolated recovery acceptance, bounded API samples and separate HTTPS/FPM/standalone release configuration.
- Harden native notification/WebSocket/account-cache lifecycle; add push lookup indexes and native push/retry API contracts.
- Android development APK compilation passed in GitHub CI; extended Expo browser acceptance includes messaging and private realtime. Installed-device/push/store acceptance remains pending.

## 0.3.0 — 2026-10-15 — Campus experience, locally verified

- Add communities, academic scopes, private membership requests, role management, events and RSVP.
- Add Pulse, topic/content search, mentions/hashtags, private messages, persisted activity and realtime invalidation through Reverb.
- Add notification preferences, block/mute enforcement, audited moderation and organization verification.
- API acceptance: **56 tests / 364 assertions** on SQLite and PostgreSQL; full web browser regression: **13 passed**. Native Reverb/worker round trip verified separately from Docker.

## 0.2.0 — 2026-10-15 — Social core

- Add PostgreSQL-backed text/image posts, nested replies, quote/repost, likes, bookmarks, follows and private requests.
- Add campus/following/profile/media/bookmark cursor feeds and owner-bound For You snapshots with published ranking rules.
- Enforce audience, private accounts, bilateral blocks and transitive source visibility; safely reencode private media.
- Add responsive consumer feed/composer/thread/profile/discovery UI, optimistic rollback and infinite scrolling.
- SQLite and PostgreSQL: 43 tests / 221 assertions; browser regression: 9 passed plus 1 media/pagination test separately. Production web build passed.
- Compatible React patch applied. Five development advisory entries remain unpatched upstream; runtime audit clean. Compose config passed; Docker runtime blocked by missing Engine.

## 0.1.0 — 2026-10-15 — Foundation

- Initialize Next.js/Laravel monorepo and private PostgreSQL local environment.
- Implement Sanctum web sessions and scoped native token endpoints, email verification/recovery, rate limits and revocation.
- Add normalized institution/profile/affiliation schema, onboarding, configurable membership review and administrator audit logs.
- Add responsive identity screens, profile uploads/privacy, theme, keyboard-accessible dialogs/menu/popover and shared API contracts.
- Add API/security tests, real browser workflows and development infrastructure/documentation.

Native-mobile and v1.0.0 releases are not declared.


- Refined Explore with compact campus shortcuts, selected navigation tabs, a contained search field and quieter topic/loading/error states.


- Added a two-panel desktop inbox, mobile chat layout, unread/search filters and an API-backed new-message picker.


- Enabled Resend API verification/recovery delivery after provider-simulator and Laravel notification acceptance. Real campus inbox delivery remains untested.


- Added batched last-message previews across web/native inboxes and reader-aware chat scrolling; improved secondary-page empty/error states and unread activity presentation.


- Hide cached conversations/composer after access errors and clear DM/activity caches after blocking. Keep narrow profile action buttons aligned. Real API privacy regressions and public UI checks passed; see maturity test evidence for source-specific scope.


- Restored missing shared form styles and corrected chat viewport sizing. Refined mobile header/navigation, feed density, nested-route selection and mobile composer presentation.

