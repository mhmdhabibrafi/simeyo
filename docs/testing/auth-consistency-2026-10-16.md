# Authentication consistency and home cleanup, 2026-10-16

Login, registration, forgot-password and reset-password now use one shared AuthLayout for header/logo/theme/navigation, centered heading/subtitle, form width/spacing and copyright footer. Recovery/reset keep existing API requests and availability checks. Submitted responses use a centered status with decorative icon and a clear return-to-login action; generic recovery wording remains unchanged and does not claim actual delivery.

Removed the permanent refresh icon from the home header. The existing new-story notice, cached reading position, tab state and feed error retry remain functional.

Web lint and production build passed. Four final local auth fixture cases passed (14.1 seconds), including 390/1440 light/dark recovery/reset before/after submit and failed-request email preservation/retry. Three local feed fixture cases check no refresh header button, actual new-story refresh, reading-position recovery and desktop/mobile keyboard/theme layout. Final runtime/public outcome follows below.

An earlier local run had two failures: a broad alert locator also matched the Next route announcer (corrected to match the actual error), and the root-to-login test could not complete while the local API was offline. The root case is reserved for public anonymous verification; no auth behavior was changed to accommodate the offline local API. Presentation fixtures do not send real recovery mail or reset any production account. Actual mailbox/provider and physical-device acceptance are not repeated by this change.

## Deployed verification

Source **d9193e9** is active on web as **auth-layout-d9193e9**; gateway recreated. API/worker/Reverb retain activity-b1bce71. Both image types built successfully; only web/gateway were recreated. Private rollback configuration and previous images retained, with database/media/provider configuration preserved. No migration or seed.

Three final local feed cases passed (10.5 seconds). Public-assets verification passed **five auth cases (34.1 seconds)** and **three feed cases (14.9 seconds)**. The anonymous public root-to-login check passed with the live API available. Recovery/reset mutation responses are fictional intercepted fixtures; no actual reset email or production password change was requested. Fresh mobile/desktop light/dark before/after screenshots and clean home-header screenshots were visually inspected.

Trusted internal TLS/security/health/CSRF and actual WSS handshake passed after restart. Exact-source standard CI 38920378428 has successful web/API jobs; the full run remains pending at this checkpoint and is not claimed passed. Physical-device and provider/mailbox acceptance remain separate.
