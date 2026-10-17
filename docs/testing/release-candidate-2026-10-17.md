# v1.0.0-rc.1 web/PWA candidate, 2026-10-17

Status: web/PWA acceptance candidate v1.0.0-rc.1; stable v1.0.0 remains HOLD. Native Android/iOS distribution is excluded from this candidate scope. This is not completed physical-device/campus-account acceptance. The latest recorded deployed application is web mobile-abb9b55 with API/worker/Reverb daily-52c533e. Changes in this checkpoint add regression coverage only; application code/images and production data are unchanged.

## New executable coverage

- Profile save runs with Playwright network offline and the CSRF route explicitly continued rather than fulfilled by a fixture. No PATCH is sent; the draft and enabled fields survive the failure, restore after reload, and save after reconnect.
- An aborted post response preserves the composer body and retry client ID. A separate real-API test persists the first request before aborting its response, retries through the API and checks the same record ID and exactly one matching feed row. The fixture-only test does not claim database persistence.
- Existing browser regressions cover feed/profile/thread Back and scroll, loading/pending states, photo crop/upload/retry, private follow approval, notifications, DM and blocking. Provider login and inbox delivery are distinguished below.

## Current evidence

- Windows Get-PnpDevice did not identify an attached Android/iPhone/ADB device; adb is not in PATH. This does not prove no device exists on the network, but no controllable physical test device was available through this environment.
- Web lint and type checking passed after adding tests. Two focused production-build cases passed locally (6.4s).
- Auth browser workflow 39004368065 on unchanged application source bfb9d3c passed seven cases (12.7s). It checks real password/session revocation with disposable identities and fixture provider/recovery presentation; it does not establish Google campus login or email inbox delivery.
- All 54 public-assets fixture browser cases passed (3.7m), including actual offline transport/reconnect and lost-response retry identity. No app source change was needed by these passing checks.
- Real-API settings regression 39004370927 on the same application code passed protected accessibility (1 case, 9.0s), sessions/media (1 case, 7.0s), social (2 cases, 18.6s).
- Real-API privacy/messaging 39004373442 passed communications (1 case, 14.8s) and social (2 cases, 18.9s).
- The owner explicitly deferred physical-device and two-campus-account testing to their own later session. Those cases remain BELUM DIUJI.
- The first new real-API retry run 39004550138 failed its final feed check with 401 because the APIRequestContext call omitted Origin. Both post attempts had already returned the same ID. Added the same explicit browser Origin/JSON headers used by the other authenticated API tests; no application security rule was relaxed.
- Corrected source 6883de0 real-API workflow [39004755772](https://github.com/mhmdhabibrafi/simeyo/actions/runs/39004755772) passed communications (1 case, 14.8s) and all three social cases (21.3s). The persisted-response-loss case passed (2.7s), including one matching feed row and equal record/client IDs across retry. Exact-source standard CI [39004754764](https://github.com/mhmdhabibrafi/simeyo/actions/runs/39004754764) passed all four jobs: web, API, mobile checks and production-stack. API completed 94 tests / 694 assertions; isolated database/media/key recovery and the 960-request production-shaped stack also passed. These results do not establish public-server capacity or physical-native acceptance. Intermediate standard run 39004549182 was cancelled by the follow-up push and is not counted as a pass.

## Dependency checkpoint

Fresh npm audit reports still contain five high web graph entries and 18 high mobile graph entries, no critical entries. npm proposes major framework downgrades for the transitive braces/node-forge findings; no forced downgrade or suppression was applied. Snapshots are in results/rc-web-audit-2026-10-17.json and results/rc-mobile-audit-2026-10-17.json. A separate fresh web npm audit --omit=dev returned zero advisory entries (results/rc-web-runtime-audit-2026-10-17.json). This is dependency metadata, not application penetration-test evidence. The full web graph result includes development tooling; it is not an assertion that every entry executes in the public web runtime.

## Required acceptance before stable v1.0.0

| Scope | Actual status | Evidence still required |
| --- | --- | --- |
| Physical Android/iOS | BELUM DIUJI | Device/OS/browser recorded; keyboard keeps save/send visible; gallery crop/upload matches output; Back restores scroll/drafts; supported OS PWA install and standalone relaunch work. |
| Two real campus accounts | BELUM DIUJI | Each owner signs into Google locally; private follow request/approval, exact notification destination, DM unread/read, bilateral block and recovery inbox/link tested. No passwords or reset links in chat/screenshots. |
| Recovery provider | BELUM DIUJI for real campus inbox | Request/reset owned account, verify old credential/session invalidation and new login; record outcome only. Synthetic or provider-simulator checks are not inbox acceptance. |
| Dependency advisories | OPEN | Compatible upstream remediation and regression evidence or an explicit documented release decision; do not silently suppress or downgrade frameworks. |
| Native distribution/push | OPEN | Existing MOBILE.md signing, physical-native and FCM/APNs gates remain. Web browser coverage does not certify native apps. |
| Operations limits | KNOWN LIMIT | Owner chose same-server backup and local monitor/journal alarms. Off-host recovery/external alert delivery are not claimed. |

Run manual acceptance on each person's own device/session. Record steps, expected/actual behavior and device details; redact email identifiers, private media, cookies and tokens. Fix reproduced bugs and repeat affected cases before changing HOLD status. The annotated v1.0.0-rc.1 tag identifies this web/PWA acceptance candidate and its evidence. Application code equals the tested/deployed app code; source 6883de0 adds tests and the candidate commit adds documentation/audit snapshots. Package milestone versions and native release gates are unchanged. No stable v1.0.0 tag or store release was created.
