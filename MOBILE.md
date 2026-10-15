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
- Expo Doctor: **21/21 checks passed**. Six pure client/dependency tests passed for origin/header/session isolation, push targets, patched URI decoding and xcode UUID compatibility.
- Push API tests passed with **mocked provider HTTP**. They prove validation, encrypted storage, revocation, generic payloads, permission rechecks and receipt cleanup; they do not prove FCM/APNs or physical-device delivery.
- Native TypeScript/lint passed. Expo component browser acceptance passed for token login, post/like persistence, profile edits visible to another account and dark theme. Android prebuild passed and its Simeyo app name, package and URI scheme were inspected. All-platform Metro exports passed again after the rename and browser fixes; compilation is not an APK, an installed app or a physical-device test.
- Android SDK/JDK/adb are not currently detected; the generated Gradle wrapper failed because JAVA_HOME/java are absent. No APK or iOS build has been produced. iOS builds require an appropriate macOS/Xcode or configured build service. No cloud build, store submission or public deployment was performed.
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

`app.config.ts` and `eas.json` define Android/iOS builds. Use `expo prebuild --no-clean --no-install` for existing generated projects; SDK 57 clears generated folders by default unless `--no-clean` is supplied. Production build configuration requires an HTTPS API. Example environment values are in `.env.example`; they contain no credentials. Android emulator API uses `10.0.2.2`, while iOS simulator/web preview uses `localhost`. Real devices need a reachable API with appropriate transport security. Development CORS permits only the explicit loopback web-preview origins in addition to the existing frontend.

## Dependency status

SDK-compatible installation initially reported 28 npm advisory entries. Verified compatibility overrides install `decode-uri-component@0.5.0` and `uuid@11.1.1` for xcode. The small, asserted postinstall shim adapts query-string 7's CommonJS call to the patched decoder's ESM default export; regression tests cover ordinary URL parameters, malformed input and xcode identifier generation. Compatible `npm audit fix` was run; no forced SDK downgrade was applied.

Current mobile audit: **18 high entries** through the unpatched braces/node-forge toolchain chains. Do not interpret Expo Doctor as a vulnerability audit. This remains a production gate, alongside the separate five web development-tooling advisory entries. See the upstream [URI decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

Implementation follows the [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [native tabs guidance](https://docs.expo.dev/router/advanced/native-tabs/) and [push setup requirements](https://docs.expo.dev/push-notifications/push-notifications-setup/).
