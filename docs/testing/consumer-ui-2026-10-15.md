# Consumer UI verification, 2026-10-15

The owner supplied Threads screenshots as a layout/interaction reference. Simeyo retains its own wordmark, black/white themes and campus privacy rules.

## Implemented scope

- Centered 640px feed, labelled desktop navigation, compact layouts at narrower widths, title outside the feed panel and a floating compose action.
- One account menu at the bottom-left of the desktop sidebar, opening upward. No scattered footer controls. Theme selection remains in Settings; wide navigation can be collapsed through the account menu.
- One-line compose trigger opens a shared modal from the feed, profile, navigation and floating action. Dirty drafts require explicit discard; pending requests lock the form. Failed posts preserve text.
- Profile information/avatar sit side by side. No empty cover placeholder; existing uploaded covers remain supported. Academic details remain small metadata, without oversized faculty badges.
- Pagination stops automatic retries after a failed page, supports manual retry and deduplicates overlapping post IDs. Feed tabs support keyboard navigation.
- Password/Firebase login cancels and clears prior private query caches before storing the new session user.
- The composer focus regression was reproduced from the owner's screenshot: an unlayered global `:focus-visible` rule overrode the textarea utility. Moving the fallback into the base layer restores the intended borderless focused editor. Audience selection now uses a themed Radix radio menu instead of the native OS popup. Follower-only guidance reflects the chosen audience.

## Actual evidence

- Bottom-menu follow-up: web lint/type checking/production build passed; six local fixture-based browser tests passed (15.0 seconds). At a 620px desktop height the trigger remains at the bottom and the popup fits above it; collapse/expand still works. The fresh `sidebar-bottom-menu.png` was visually inspected.

- Web lint, type checking and production build passed.
- Six UI/browser tests passed locally (13.2 seconds at the latest sidebar checkpoint). These use explicitly fictional API fixtures, not production user data. Covered desktop/mobile widths 320/390/768/1440, light/dark, keyboard tabs, account menu/collapse, modal draft protection, pending/failed posting, pagination failure/retry, profile compose and the focused dark editor/audience menu. Axe WCAG 2.1 AA checks passed in the exercised views.
- Before the final focus/sidebar adjustments, the deployed public assets passed five fixture-based UI tests (15.9 seconds). A separate 320px public-assets modal/profile probe passed. This proves presentation and interactions with fixtures, not real production-account mutations.
- [2a3b7f2 full API/PostgreSQL browser acceptance](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38732069351): all 23 tests passed. Included posting, replies, quotes, edit/delete, moderation, media storage, cursor scrolling, follows/private requests, block/mute, communities/events, messaging/realtime, password/session revocation and accessibility. This run precedes the focused editor/sidebar follow-up.
- [2a3b7f2 standard checks](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38732065245): all four jobs passed; API/PostgreSQL 78 tests / 507 assertions, web, mobile and the HTTPS/FPM/worker/realtime/load/recovery stack.
- Production public HTTPS/CSRF/invalid-token checks, internal trusted TLS, WebSocket handshake and worker/database health passed after the consumer layout deployment. No production fixtures were seeded and existing credentials/data were preserved.
- The earlier local failed-post test initially matched both its error and Next's route announcer. The assertion was scoped to the form error; it passed afterward. This was a test selector failure, not a claimed application fix.

## Final follow-up checkpoint

Source 34412db includes the focused composer and consolidated header menu. Image `consumer-34412db` built successfully and was deployed by recreating only web/gateway. All six tests passed against the public deployed assets with fictional API fixtures (20.7 seconds), including the focused dark editor, themed audience radio menu, correct follower guidance and header navigation collapse/expand. Fresh dark focused-editor/menu screenshots were visually inspected. Internal trusted TLS, API/database/security checks and actual WebSocket handshake passed again.

The [latest full browser workflow](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38734142021) and [standard checks](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38734113559) have been launched; do not mark either passed until its result is available. Latest native installed-device, physical push and real Google campus-account acceptance remain outside this UI evidence. No claim that every possible bug or v1 release gate is complete.
