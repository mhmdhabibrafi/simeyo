# Profile, post and conversation follow-up, 2026-10-16

Work in progress. Existing edit/delete/post APIs were inspected and preserved. Web adds bounded canvas cropping/pan/zoom with explicit save/cancel, supports profile and cover crops, and retains failed crop uploads. Existing image MIME/transport/server reencoding remains authoritative.

Post editing distinguishes an unchanged form from a real edit, preserves draft text, guards close during saving, confirms draft disposal and updates feed/search/pulse caches. Delete confirmation guards busy state and refreshes dependent lists; deleting a detailed story returns to Home. Existing owner-only API policies remain.

DM search is participant/campus/block-authorized, literal and cursor-paginated; searching does not mark results read. Chat header adds profile, block confirmation and report. Reports snapshot only one selected incoming message (latest by default, or no message), deduplicate retries for that evidence and enter a campus moderator queue. Independent review, administrator-only suspension, staff-role protection, session/token revocation and audit are enforced. A new additive conversation_reports migration is required; no existing table is replaced.

Navigation stores only coordinates per history entry in browser memory (60 entries), preserves profile tab per account/session, retains feed query caches for 30 minutes and restores when returning while data is available. User scroll/key/touch input cancels automatic restoration. Logout clears navigation memory. No private post/message bodies are persisted to browser storage for navigation.

Actual verification so far: isolated SQLite API **89 tests / 632 assertions passed (22.643 seconds)**; image crop geometry **2 unit tests passed**; initial web lint/type checking/production build passed. Browser interaction and deployment are not yet verified at this checkpoint.

## Two real account acceptance

Owner explicitly answered that two real accounts cannot be tested now; continue isolated acceptance. Real Google sign-in, campus inbox delivery/reset links, physical-device keyboard/camera/share/install remain BELUM DIUJI. No production owner impersonation or credential collection is authorized by this test plan.

When two account holders are available: each signs in themselves; A follows B and B checks notification/destination; accept the request if private; A sends a unique harmless message, B checks reception/read ticks and replies; use search in that chat; test profile/story Back positions; request recovery from A, open its inbox link privately, change password and verify old credential/session behavior. Report only success/failure and symptoms, never password/token/reset link. Block/report tests should use explicitly agreed test messages and be coordinated to avoid false moderation reports.

Before the final evidence-picker adjustment, all 41 local fixture UI cases passed (2.5 minutes). Final shared block-cache clearing then passed seven focused cases (24.5 seconds), including cached-story denial after browser Back, actual JPEG crop pixel/dimension verification, corrupt-image rejection, post edit/delete failures, message search/read isolation and moderation review. Fresh crop/search/restored-profile screenshots were inspected. Final selected-evidence request validation is being verified.

Selected-evidence API validation passed the full isolated suite: **89 tests / 635 assertions (23.672 seconds)**. Six shared contracts passed. After the selected-evidence UI adjustment, four focused local browser cases passed (13.1 seconds), including actual selected message ID, corrupt photo rejection and JPEG pixel/dimension verification. Web lint/type checking/unit/build passed; final server images and public UI are not yet claimed verified.

Private pre-release backup: database `pre-everyday-20261016T160355Z.dump` passed pg_restore inventory validation; media `pre-everyday-20261016T160355Z.media.tar.gz` passed archive inventory validation. These archives stay restricted on the server. Application-key/environment rollback snapshot is retained before migration/deployment; this is not off-host recovery or a production restore drill.
