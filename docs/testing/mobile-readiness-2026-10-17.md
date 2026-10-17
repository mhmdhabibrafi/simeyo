# Mobile UI and profile readiness, 2026-10-17

Application source abb9b55 is deployed on web as mobile-abb9b55, with gateway recreated. API/worker/Reverb retain daily-52c533e because their source is unchanged. This change concerns the responsive web/PWA interface; it does not certify Expo or physical phones.

## Changes

Profile text/privacy drafts are account-scoped sessionStorage entries with a 24-hour expiry, validated field limits and no photos/passwords/tokens. They restore after a failed save, reload or navigation and clear on successful save, explicit discard or logout. Storage failure leaves editing functional and displays a local recovery limitation. Drafts should be reviewed before saving; this is not cross-device synchronization or conflict merging with another editor.

Profile PATCH results update the authenticated cache directly. Successful avatar/cover uploads and removals update matching account/profile caches from their actual response; in-flight reads are cancelled before applying the result, and account identity is rechecked to avoid repopulating a different signed-in user's cache. A synchronous write lock prevents duplicate profile mutations; fields/back/dismiss controls reflect busy state. Text is preserved through photo operations and failed requests.

Transparent crop previews are filled white each frame, matching JPEG export rather than accumulating alpha/previous frames. Avatar failures retain a fixed initials fallback; cover failures retain their aspect-ratio space and provide retry. Very long names remain available to assistive technology/title while visually limited to three lines; avatar placement is independent of name height.

Profile/list/thread/password/communication page headers share sizing and Back controls. Form fields use mobile 16px text to avoid focus zoom. Dialogs/crop sheets/toasts use visual viewport size and offset; message sizing shares that source. OS and user reduced-motion choices remain authoritative. Pending dialog actions disable dismissal, while photo errors are announced in the active dialog only.

Empty Following and bookmarks pages offer working destinations, and empty own-profile feeds can open the composer. Profile/relationship/communication errors provide retry; inaccessible cached profiles are hidden after authorization/read errors. Password changes retain existing server rules and disable fields while pending; no password draft is stored.

## Verification checkpoints

- Web lint/type checking and four unit tests passed (crop geometry plus draft isolation/expiry/validation/storage failure/cleanup).
- Initial targeted browser runs found duplicate photo alerts and selectors that matched Next's route announcer. Tests now target the actual error and real media response shape. Next Image normalizes src attributes to absolute URLs when an error handler exists; fixture assertions and authenticated media request construction now support both relative/absolute URLs.
- Nine corrected targeted development-browser cases passed (42.3 seconds), including duplicate save, recovery, output pixels, constrained keyboard viewport, long identity, cover retry, image upload/reload/removal and old profile-edit failure/retry. The final name-height/avatar placement refinement is included in the final production build/rerun, not claimed covered by the earlier checkpoint.
- All 52 local production-build fixture browser cases passed (3.2 minutes), including the final name-height/avatar-placement refinement. All 52 deployed public-assets fixture cases also passed (3.5 minutes).

Keyboard evidence uses an explicitly simulated visualViewport at height 360/top offset 30 within a 320x640 browser. Light/dark and long-text checks use fixtures and Axe. Physical keyboard/camera/gallery/OS-install and two real campus accounts remain BELUM DIUJI, as previously deferred. Real API acceptance uses disposable accounts/databases only; no production owner impersonation or seeding.

## Deployment checkpoint

Before deployment, the existing backup helper completed a verified same-host backup at `/srv/simeyo/backups/scheduled/20261017T031640Z-04b3e542/`. This is not off-host protection. Both image builds completed successfully; only web/gateway were recreated. A private pre-change environment snapshot and previous images remain for rollback. No migration, production seeding or restore was performed.

Post-start checks passed: trusted HTTPS, root/login/manifest/API health (200), authenticated API rejection (401), hidden environment/PHP entry (404), CSRF cookie (204) and unsafe requests without CSRF (419), plus an actual WSS handshake. Queue probe passed, ready/failed jobs were zero, recent 5xx was zero and the operations monitor reported healthy.

Fresh screenshots were inspected for the 390px dark editor, 320px long light profile and simulated keyboard dark crop sheet. Evidence distinguishes mocked UI behaviors from the separate real API/database browser workflows.

## Final acceptance

- Exact-source standard CI [38998215997](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38998215997) passed every web/API/mobile/production-stack job. API: 94 tests / 694 assertions; isolated backup/restore and 960-request production-shaped load checks also passed. These checks do not establish public-server load capacity.
- Real API/database browser settings regression [38998216764](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38998216764) passed: protected accessibility (1 case, 8.8s), sessions/media (1 case, 6.7s), social (2 cases, 18.7s). Actual avatar/cover upload, reload, removal and private-media protections were exercised against disposable data.
- Real API/database privacy/messaging browser workflow [38998219851](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38998219851) passed: communications (1 case, 12.6s), social (2 cases, 15.0s).
- Public-assets run used fictional API fixtures, not production-user authentication. Fresh 320px light editor and light keyboard-sheet screenshots were inspected after the final public run as well.

No v1.0 readiness certification: physical-device keyboard/gallery/install and real campus-account/provider/email acceptance remain BELUM DIUJI. In-browser storage can be unavailable; recovery reports that limitation. Image selections are not stored across reload, and independent concurrent profile editors are not merged automatically.
