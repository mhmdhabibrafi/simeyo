# API

Daily streak: GET /api/v1/me/streak returns the approved signed-in campus member's current_days, longest_days, completed_today, timezone (Asia/Jakarta) and next_reset_at. It is read-only; successful new post/reply creation updates the count transactionally. No historical backfill or public per-user streak endpoint. See docs/api/openapi.yaml and docs/testing/streak-2026-10-17.md.

Prefix `/api/v1`. See [OpenAPI](docs/api/openapi.yaml) and generated [TypeScript contracts](packages/api-contracts/src/generated.ts). `npm run contracts` regenerates both from `infrastructure/scripts/write-openapi.mjs`; the shared Zod schemas validate user responses and forms and are checked against the generated user type.

Implemented modules: web/native authentication, verification email/recovery, own sessions, current user/profile, academic catalog/onboarding, affiliation submissions, administrator review, private profile media. Detailed route inventory is available using `php artisan route:list --path=api/v1`.

Successful resources use `{data: ...}`, validation errors `{message, errors}`, standard failures `{message}`. Logout and revocation use 204. Administrator queues use Laravel's page-based pagination (20 items); social feeds use cursor pagination. Responses from public profiles omit email, system role, approval internals and hidden academic metadata.

Mutation requests on web require CSRF. GET private endpoints require authentication; campus/profile/review additionally require verified email and approved affiliation. Media `/media/profiles/{userId}/{filename}` is outside `/api/v1`, private/no-store, with same-campus and current-path checks. It does not expose arbitrary storage files.

The OpenAPI describes implemented identity, social and in-progress campus operations. Some catalog/review/session response structures are documented narratively rather than fully generated models; expanding schema coverage is required before the native/social modules.


## Activity and search follow-up, 2026-10-16

`GET /api/v1/search/topics?q=...&cursor=...` returns `{data: [{name, posts_count}], next_cursor}` with 20 alphabetical topics per page. Query is optional, max 80 characters; leading # is ignored and SQL wildcard characters are literal. Counts include historical posts currently visible to the authenticated campus member and exclude muted authors. It does not disclose private/blocked posts.

`GET /api/v1/notifications` remains a flat cursor list with underlying unread counts; optional nullable `follow_state` is the current incoming relationship state. Web groups loaded entries by kind/destination/day, deduplicates page overlaps and marks underlying owned IDs read. Detailed moderation and verification decisions remain individual.

DM retry reuses the original `client_id` and body; changing the draft creates a new request identity. Successful responses update the message cache, while date separators and send failure/retry are presentation only. Existing PostgreSQL uniqueness and permission checks remain authoritative. No migration is required for this update.


## DM recipient discovery

`GET /api/v1/people?context=messages` lists visible same-campus verified accounts, including existing followers/following, excluding the caller and both directions of blocking. The default suggestion list is unchanged. Omit `q` when empty; nonempty searches use literal wildcard escaping and cursor pagination (20 users). This discovery context does not grant messaging permission: conversation creation and sending retain recipient DM policy, block and campus checks.


## Profile/post/DM follow-up

Profile uploads remain authenticated multipart `POST /me/media`; the web cropper exports metadata-free JPEG before the existing server validation/reencoding. Avatars use square crops, covers use 3:1 crops. Selecting/cancelling a crop does not upload. Photo save is independent from the profile text form.

Post PATCH/DELETE contracts and owner policies are unchanged. Web now guards unsaved edit/quote closure, preserves failed edits and confirms deletion; successful mutations refresh feed/search/pulse caches.

`GET /conversations/{id}/messages?q=...&cursor=...` searches only an authorized conversation with literal wildcard escaping, 30 messages per cursor page. Omit empty q. GET/search never changes read cursors; existing explicit PUT read remains authoritative.

`POST /conversations/{id}/report` accepts reason (`spam`, `harassment`, `hate`, `other`), optional details (1000 chars), and optional incoming `message_id`. The selected message must belong to this conversation and the other participant; latest incoming is the default. Only that message is snapshotted for review. Retry for the same reporter/conversation/evidence is deduplicated. No message may be attached if none exists.

`GET /admin/message-reports` exposes a cursor-paginated evidence queue only to same-campus moderators/admins. `PATCH /admin/message-reports/{id}` accepts action (`dismiss`, `warn`, `suspend`) and note (10-1000 chars). Review must be independent from reporter/subject. Suspension requires an administrator, cannot target staff moderator/admin roles, revokes sessions/tokens and records audit/decision notifications. Actions cannot target a member who has moved campuses. This requires the additive conversation_reports migration. Chat block uses the existing graph API and clears all affected private caches.


Daily-use additions (2026-10-17): PUT/DELETE posts/{id}/feedback accepts reduce_author boolean; only visible posts may be hidden. GET/DELETE feed/preferences reads/resets own preferences. Hidden stories leave home feeds; reduced-author score is x0.25 in new For You snapshots. GET conversations/unread aggregates all currently authorized incoming unread messages. GET/PUT conversations/{id}/typing checks conversation authorization; PUT requires current send permission and accepts only a boolean; cache TTL six seconds. DELETE me/media/avatar or me/media/cover removes only that current owner's photo. OpenAPI describes the new operations.
