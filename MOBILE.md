# Mobile experience — implementation in progress

The existing Next.js/Laravel platform is preserved. `apps/mobile` adds a separate Expo SDK 57 / React Native 0.86 client that imports `packages/api-contracts`; it does not embed the web UI. The owner confirmed the new application name **Simeyo**, native scheme `simeyo` and Android/iOS identifier `app.simeyo.mobile`. v0.4.0 and v1.0.0 are not declared complete.

## Implemented in the working tree

- Next.js PWA manifest, original application icons, standalone configuration, explicit update/install controls and a public offline page. Its service worker never caches API/media/protected HTML/RSC responses.
- Expo Router native bottom tabs on Android/iOS, with a React Native Web fallback for local QA; native feed, nested thread views, composer with photo selection/resizing/private upload, post interactions, user profiles/editing, follows, discovery/Pulse/search, bookmarks, communities/events, messaging and activity screens.
- Native bearer authentication with device-only SecureStore credentials; first-install handling removes stale iOS keychain sessions. The web preview deliberately stores its token only in memory. Account changes clear query/image state. API requests omit browser cookies and reject redirects/path escapes.
- Theme selection follows the device or an explicit light/dark preference. Feed virtualization and incremental cursor loading bound rendering work; images use authenticated URLs and no persistent private image cache.
- Laravel push-device registration bound to native access tokens, encrypted device tokens, revocation on native logout, visibility/preference checks before sending, generic notification payloads, queued Expo tickets/receipt processing and invalid-device cleanup. Push is disabled by default.
- Native post retry UUIDs prevent duplicate posts after network retries, including image-only posts. Message retry UUIDs are also persisted and checked by the API.

## Evidence and limits

- Production PWA browser test **passed**: real service worker, parsed manifest, authenticated private API/no-store checks, cache inventory, offline navigation without identity data and reconnect. Screenshot: `docs/testing/screenshots/pwa-offline.png`.
- Expo Doctor: **21/21 checks passed**. Eight pure client/dependency/configuration tests passed for origin/header/session isolation, push targets, patched URI decoding, xcode UUID compatibility and release-profile HTTPS validation.
- Push API tests passed with **mocked provider HTTP**. They prove validation, encrypted storage, revocation, generic payloads, permission rechecks and receipt cleanup; they do not prove FCM/APNs or physical-device delivery.
- Native TypeScript/lint passed. Expo component browser acceptance passed for token login, post/like persistence, profile edits visible to another account, dark theme, sending/receiving/reading messages and actual private Reverb invalidation-only delivery. Android prebuild passed and its Simeyo app name, package and URI scheme were inspected. All-platform Metro exports passed again after the rename and browser fixes; Metro export is separate from the later APK build and does not establish installed-device behavior.
- This Windows host lacks Android SDK/JDK/adb. GitHub CI compiled an ARM64/x86_64 development APK and a Debug iOS simulator app using macOS/Xcode, then installed/launched the iOS process. The first iOS screenshot remained on the system development-client Open dialog, so it does not prove login rendering. Android emulator and iOS UI assertions are being exercised separately; use PROGRESS.md for actual acceptance results. No EAS build, distribution signing, store submission or public deployment was performed.
- FCM/APNs/Expo project credentials and physical-device push delivery remain **BELUM DIUJI**. Configure the real project ID and provider credentials before enabling `EXPO_PUSH_ENABLED`.

## Local commands

```powershell
cd apps/mobile
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
node --test tests/client.test.ts tests/dependency-compat.test.cjs
npx.cmd expo start
```

`app.config.ts` and `eas.json` define Android/iOS builds. Use `expo prebuild --no-clean --no-install` for existing generated projects; SDK 57 clears generated folders by default unless `--no-clean` is supplied. Both preview and production profiles require HTTPS API and web origins without credentials, paths, queries or fragments; release Android cleartext traffic is disabled. Example environment values are in `.env.example`; they contain no credentials. Android emulator API uses `10.0.2.2`, while iOS simulator/web preview uses `localhost`. Real devices need a reachable API with appropriate transport security. Development CORS permits only the explicit loopback web-preview origins in addition to the existing frontend.

## Dependency status

SDK-compatible installation initially reported 28 npm advisory entries. Verified compatibility overrides install `decode-uri-component@0.5.0` and `uuid@11.1.1` for xcode. The small, asserted postinstall shim adapts query-string 7's CommonJS call to the patched decoder's ESM default export; regression tests cover ordinary URL parameters, malformed input and xcode identifier generation. Compatible `npm audit fix` was run; no forced SDK downgrade was applied.

Current mobile audit: **18 high entries** through the unpatched braces/node-forge toolchain chains. Do not interpret Expo Doctor as a vulnerability audit. This remains a production gate, alongside the separate five web development-tooling advisory entries. See the upstream [URI decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

Implementation follows the [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [native tabs guidance](https://docs.expo.dev/router/advanced/native-tabs/) and [push setup requirements](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Android development artifact

The manual `Android development APK` GitHub workflow compiled `assembleDebug` for ARM64 and x86_64: https://github.com/mhmdhabibrafi/simeyo/actions/runs/38689605244. The artifact is named `simeyo-android-development` and has a short retention period. A copy was downloaded to the ignored `.local/Simeyo-development.apk` (157,016,199 bytes); ZIP inspection confirmed the binary manifest/package string, DEX files and both native architectures. SHA-256: `b83d860c81d8aa4c25bba1c95481eff702b11b32c993ac94f874684c784fdf60`. This inspection is not Android installation or independent APK-signature verification.

It uses generated development signing and the Expo development client; it requires Metro and a reachable local API. It is not a standalone production/store release, and FCM/APNs credentials are not configured. On an Android emulator, `10.0.2.2` reaches the host's IPv4 loopback; `dev:api` now binds `127.0.0.1` explicitly. The optional registration/recovery web origin must also be reachable from the emulator. A physical phone needs explicitly configured reachable API/web origins. Native store distribution, release signing and physical-device acceptance were not performed; the web release candidate is hosted separately.

Native settings now include current-password-authenticated password rotation. Successful rotation revokes native tokens; the client clears credentials/cache and returns to login. Installed-device acceptance for this new screen remains pending.
