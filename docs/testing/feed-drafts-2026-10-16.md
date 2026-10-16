# Feed and text drafts, 2026-10-16

## Behavior

- Web composers save text and audience synchronously after editing, in this browser's local storage. Keys separate accounts, new posts, replies, quotes, communities and edits. Invalid or more than seven-day-old records are ignored/removed when opened. Logout clears all Simeyo draft keys; sending successfully or explicitly discarding a new-post draft removes that draft. Browser storage failures are shown without disabling writing or posting; saving/closing is disabled when saving fails.
- The composer mounts after the authenticated user is known and is keyed by account/context, so another user's saved text is not restored into the editor. Restored drafts identify themselves. Photo/file bytes and uploaded preview URLs are not persisted; the interface explicitly requests selecting photos again after reload/closing. Drafts are local to the browser, not synchronized across devices. Concurrent editors use the last write to the same key.
- An unchanged text-only retry retains its request identity across reloads. Changed payloads keep the existing behavior of obtaining a fresh identity. Restoring text without its previous attachments changes the payload; image-post recovery is not claimed.
- A successfully saved/restored text-only draft does not prompt on browser reload. Photos, pending files, active requests and unavailable draft storage retain the existing unload warning where the browser supports it.
- Home feeds retain cached reading content on remount, window focus and reconnection. A separate first-page check runs once a minute while the home feed is active (and may check on focus/reconnect); a higher new post ID offers `Lihat cerita baru`. Background checks leave the reading list intact; activating the notice refreshes it and returns to its start. Existing manual refresh and user-initiated mutation invalidation remain available. This is bounded polling, not a new post broadcast channel. Profile/thread/community feeds retain normal refresh behavior and never show a home-feed update notice from shared cache.
- The selected home tab is remembered in this tab's session storage. Browser Back can restore the cached list and its reading position. A connection indicator explains that loaded stories remain readable; automatic pagination pauses offline. This does not add private offline service-worker caching.

## Verification

Web lint, type checking and production build passed. Initial fixture regression passed 23/25 cases: one new error assertion also matched Next's route-announcer alert, and the existing upload-progress assertion also matched the new draft status. The error assertion is scoped to its message; draft status is hidden during active uploads/sends to avoid simultaneous live announcements. Final regression and deployment results follow when verified. No API, schema or native source change.

Earlier gallery-source standard CI 38896544145 is now confirmed successful across all four jobs, including the production-stack job that was pending in its earlier checkpoint.

The corrected 25-case local presentation run passed (1.7 minutes), including actual draft reload/audience recovery, saved-close/discard, expired/account/reply isolation, blocked-storage feedback, unchanged retry IDs across reload, logout cleanup, new-story polling/manual reveal, offline cached content and browser Back with its selected feed/reading position. Fresh mobile draft recovery was visually inspected and passed WCAG AA checks. The final unload-warning refinement is undergoing a new regression with a stronger stale-cache Back assertion.

Final source **002b3c8** passed **26 local fixture UI cases (1.3 minutes)** after the unload refinement and a cached-campus/reply isolation guard. The strengthened Back test advances beyond the 15-second main-query stale window, verifies the selected Following tab and reading position, and verifies no feed fetch on remount. A saved text-only reload causes zero unload prompts. Draft-recovery and new-story screenshots were visually inspected. Lint and the production build passed on this source; TypeScript checking also runs within the build.

Standard CI [38900237577](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38900237577) and real-API settings/session/social browser regression [38900304106](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38900304106) were started on 002b3c8. Their results are pending at this checkpoint.

## Deployment acceptance

Both release image types built successfully. Web is active as `feed-drafts-002b3c8`; only web/gateway were recreated. API/worker/Reverb retain `experience-e4bbb57`; PostgreSQL and media volumes, application keys and Firebase/Resend configuration were preserved. A private environment rollback snapshot and earlier images were retained. No migration, seed or production-account mutation was performed.

Trusted internal TLS, public/private route security responses, health checks and an actual WSS handshake passed after recreation. The worker queue probe passed with zero ready/failed jobs. **All 26 public-assets fixture cases passed (2.2 minutes)**, using fictional API data against the deployed JavaScript/CSS. The fresh mobile draft-recovery screenshot was visually inspected. This is not production-account or physical-device acceptance.

CI API, web and mobile jobs have passed; the production-stack job and targeted real-API browser run remain in progress at this checkpoint. Installed-device behavior, real campus Google/email acceptance and v1 recovery/push gates remain outside this change. Drafts contain local text/audience only, not durable photo uploads or cross-device synchronization.

## Final CI result

Both exact-source runs completed successfully: standard CI **38900237577** passed all four jobs (API, web, mobile and production-stack); targeted real-API browser run **38900304106** passed all **four cases** across protected accessibility (9.0 seconds), device-session/media (5.3 seconds) and social/privacy (two cases, 18.2 seconds). These use the isolated PostgreSQL/API/realtime environment, not production accounts. This is a successful targeted regression, not a new complete full-browser workflow. Deployment runtime remains 002b3c8; final documentation-only commits need no application rebuild.
