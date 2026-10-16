# Messaging discovery and presentation, 2026-10-16

The DM picker sent `people?q=`. Empty-string normalization causes the optional string validation to reject that explicit empty value with 422. Omitting the query alone would still use recommendations that intentionally exclude already-followed users. The picker now omits empty q, uses explicit messaging discovery, scopes cache by account/search, supports cursor pagination and deduplicates overlaps. Discovery includes existing connections while retaining same-campus, verified email/affiliation and bidirectional block filtering. Conversation/send policy remains authoritative.

People search now uses explicit literal LIKE escaping consistently on SQLite and PostgreSQL, including usernames containing underscores. The first new API regression failed because followed users were absent; after the context fix its underscore search exposed the old database-specific escape behavior. Both were corrected. API suite: 86 tests / 590 assertions passed (14.809 seconds); contracts: five passed. Pint passed/fixed only the touched API files. No migration or dependency change.

Explore promotes one persistent search field above compact result filters, keeps community/event shortcuts disabled as previously requested, and provides an account-search action from empty story results. Account/campus settings use compact email/campus rows with wrapping identity and explicit verification. Root title is now Simeyo without the old slogan/em dash.

Initial web lint/build passed. First 36-case local fixture run passed 35 and failed a new two-theme test because it assumed the stories tab despite the deliberately restored people tab. The fixture now explicitly selects stories each loop. All 35 other cases, including new DM pagination/retry/query regression and existing Explore/accessibility/settings/privacy tests, passed. Final layout tweak moves Requests beside the Explore title to avoid an extra mobile action row; final checks follow below.

The real-API communications browser case is extended to follow a fictional member, discover that already-followed member with no query, search its underscore username, then create a persisted conversation and exercise realtime. It uses a disposable CI database only, never owner accounts or production messaging mutations. Actual production-account acceptance remains separate.

Final application source passed lint and production build. All six focused local scenarios passed (31.4 seconds), including the corrected empty-result/theme test, new recipient query/error/pagination regression, preserved profile Back search, settings accessibility, existing send retry and six-size/theme Explore matrix. Fresh DM/Explore/settings screenshots were visually inspected. A private pre-release database dump `pre-discovery-20261016T151357Z.dump` passed archive inventory validation; this is not an off-host backup or restore drill.

Application source **5f4e084** is deployed as **discovery-5f4e084** on API/web/worker/Reverb, with gateway recreated. Private environment rollback snapshot and previous images retained. Database/media volumes, keys and provider settings preserved; no migration or seed ran. Trusted server TLS/security/health/CSRF and actual WSS checks passed.

The final full local run passed 35 cases and exposed a pre-existing fixture race in the held DM response: React pending UI could appear before the route handler assigned its release callback. The fixture now explicitly waits for that callback. Three focused repeats passed (11.2 seconds), without application-source changes. Final public presentation checks use that corrected fixture.

Real-API communications run [38922500179](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38922500179) passed **one case (9.7 seconds)**, covering the newly followed member's picker discovery and underscore search, persisted sending, private Reverb, read status and mobile accessibility against disposable PostgreSQL. Standard CI [38922483284](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38922483284) has successful API/web/mobile jobs; production-stack remains pending at this checkpoint. No production account was impersonated or changed for acceptance.

## Final deployed acceptance

All **36 public-assets UI cases passed (2.7 minutes)**, including recipient discovery/pagination/error retry, restored search, empty-result account navigation, account/campus rows, exact browser title and previous accessibility/privacy/profile/media/feed cases. Screenshots were visually inspected. Fixtures use synthetic identities; the settings illustration uses a fictional campus email. One additional focused public repeat refreshes those identity screenshots without touching production accounts.

Standard CI **38922483284 passed all four jobs**, including the PostgreSQL API suite and the isolated production-shaped TLS/WSS/worker stack. The live queue probe passed with zero ready/failed jobs. The real-API communications case above separately verifies persistence and permissions. No production credentials, affiliation status, social relationships or messages were modified by acceptance. Physical-device/provider/mailbox gates are unchanged.

The final follow-up includes only fixture synchronization, fictional identity/artifact updates and documentation; runtime application source remains 5f4e084.
