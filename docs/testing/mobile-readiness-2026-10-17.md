# Mobile UI and profile readiness, 2026-10-17

Implementation and final acceptance in progress. This change concerns the responsive web/PWA interface; it does not certify Expo or physical phones.

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
- Final complete production-build and deployed-assets browser runs plus exact-source CI remain pending at this checkpoint.

Keyboard evidence uses an explicitly simulated visualViewport at height 360/top offset 30 within a 320x640 browser. Light/dark and long-text checks use fixtures and Axe. Physical keyboard/camera/gallery/OS-install and two real campus accounts remain BELUM DIUJI, as previously deferred. Real API acceptance uses disposable accounts/databases only; no production owner impersonation or seeding.
