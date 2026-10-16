# Activity, search and messaging acceptance, 2026-10-16

Activity groups loaded duplicate events by kind, destination and calendar day while keeping individual decisions readable. Current incoming follow state selects pending Requests or the actor profile. Moderation decisions stay on their readable activity anchor rather than a potentially removed post. Read marking retains ownership/visibility checks and deduplicates IDs across cursor pages.

Explore distinguishes people, stories and topics, preserves submitted queries/tab in account-scoped session storage across profile Back/reload, and clears those keys on logout. Topic search is API-backed, alphabetically cursor-paginated and filtered by current post visibility/mutes. No new database schema or dependencies.

DM displays pending and failed messages in context, retries the same body/client UUID, deduplicates confirmed messages and preserves text drafted while an older send is retried. Errors live beside the failed message rather than a toast covering the composer. Calendar separators and reduced VisualViewport sizing improve browser chat navigation.

Actual verification so far:
- Isolated SQLite API: 84 tests / 570 assertions passed (12.710 seconds). New cases cover topic visibility, historical pagination, mute filtering and current follow state. An earlier fixture incorrectly placed 25 hashtags on one post despite the existing 20-tag indexing safeguard; it failed and was corrected to use two posts without changing that safeguard.
- Shared contracts: 5 tests passed. OpenAPI and generated TypeScript regenerated.
- Web lint, type checking and production build passed before the final inline-error presentation correction.
- 34 local production-build UI cases passed (1.7 minutes) before that final correction. They include activity destinations/read IDs, query restoration, duplicate-safe DM retry/new draft/date separators, reduced mobile viewport/back, existing photo retry, theme/accessibility/profile checks and real worker offline behavior.
- Visual review caught a stale send-error toast overlapping the composer after retry. Final correction moves the error into the failed bubble and adds a no-stale-error assertion. Final build/test outcome is recorded below when available.

Browser service-worker acceptance uses the actual manifest/worker/cache and an anonymous offline navigation, not an API fixture. Other presentation scenarios use fictional account/API fixtures; they do not prove real-account production mutations. Native install prompting is simulated in the existing install-offer case. Physical-device keyboard, OS installation, camera/photo picker, Firebase provider acceptance and real mailbox acceptance remain BELUM DIUJI. The owner confirmed no physical device is available and requested browser testing.

Deployment has not yet been performed for this change at this checkpoint. Production data, keys, existing provider configuration and volumes must be preserved; no seed, reset or migration is needed.

Final inline-error source passed web lint, type checking and production build, all 34 local production-build UI cases (1.8 minutes), and all five contract tests. Fresh reduced-viewport screenshot was inspected: the stale error toast is gone and the composer/send action remains reachable.

Fresh private production database backup passed archive inventory validation before deployment: `pre-activity-20261016T132824Z.dump`, SHA-256 `a9736777c8736798376a8f36ff20ad02e8dff04158520b19aa5eef51b3a9a4089`. This is not a restore/off-host recovery drill.
