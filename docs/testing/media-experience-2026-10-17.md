# Photo experience, 2026-10-17

Implementation acceptance checkpoint. Final CI/deployment results will be recorded below after completion.

## Scope

Web/PWA media viewer now shares swipe, two-pointer pinch, 100-400% zoom controls, bounded pan, keyboard navigation, reset, count indicator, retry and a 44px top close control. Arrow keys navigate at 100% and pan when enlarged. Swipe navigation is disabled while enlarged; resetting or changing photos clears pan/zoom. Profile avatar opens the same viewer for the stored cropped photo. Banner remains 3:1. Existing authenticated media URLs and access checks remain; no original uncropped source or public download URL is exposed.

Composer retains one slot per selected file through upload failures. It reports per-file byte-transfer percentage and distinguishes transfer completion from server processing. Uploads use the existing CSRF/session boundary and XHR with a five-minute timeout; unmount aborts pending uploads. Individual failed slots and the remaining failed batch can be retried; successful slots are not uploaded again. Sorting controls move successfully uploaded photos before posting, using touch/keyboard-accessible buttons. Sorting is disabled while uploads remain pending. Selected images themselves are not persisted through a reload; existing text draft recovery and leave warnings remain.

The additive post_media.position column persists media_ids order; ties use ID to preserve the old ordering for historical rows (default zero). Quote media follows the same relation ordering. Existing client_id request fingerprint includes ordered media_ids; a different order with an already accepted retry ID is rejected rather than silently changing the published post.

Runtutan UI is unchanged. Its existing tests validate the next WIB calendar day, repeated old retries after midnight, gap reset and longest retention with simulated server time. No real next-calendar-day owner usage or physical-device acceptance is claimed.

## GitHub baseline

Before changes, HEAD and origin/main were synchronized (0/0), working tree clean, no open PRs and the latest standard workflow 39006295021 passed. The older failure 39004550138 is retained as historical evidence; corrected source workflow 39004755772 passed. No unresolved merge conflict or active failing latest-source check was found; historical runs were not deleted or relabelled.

## Actual local verification

- API: 97 tests / 738 assertions passed on SQLite (15.936s) and isolated PostgreSQL (34.670s), including new order/read/quote/retry/legacy-order checks. The test service was started without rewriting .env or credentials; only ruang_test was used.
- Shared contracts: eight passed. Web unit: five passed, including actual helper transpilation and fake XHR byte progress/CSRF/credentials/HTTP rejection/abort checks. The first unit attempt hit Node's unsupported TypeScript parameter-property stripping; the test now uses the installed TypeScript transpiler without changing the application error class.
- Lint/type and production build passed. Five initial focused UI cases found one test-selector failure: the pending action is named Mengunggah, not Bagikan. Corrected the assertion; no application action behavior was relaxed.
- Corrected new viewer/composer cases passed (9.5s); all 57 production-build UI fixture cases passed (2.5m). Checks include CDP touch pinch and pointer swipe, zoom/pan navigation behavior, image retry, focus restoration, 320px themes/Axe/overflow, avatar opening, banner geometry, per-file retry call counts and selected post order. Touch emulation is not physical-phone evidence.
- Real local API/database gallery browser case passed (19.7s): three valid PNGs went through the actual XHR/CSRF API, were reordered, posted, reloaded in the same order, and viewed through authenticated media responses. DB config was guarded to ruang_test; media/framework/log storage was separately redirected into ignored .local/media-qa/storage. No existing app env or production account was changed. The first helper setup lacked the CLI pdo_pgsql extension; adding the process-only flag fixed setup before executing the test.
- Fresh viewer screenshots were inspected. No new dependencies, native Expo UI, image-source backfill or public storage changes were introduced.
