# API

Prefix `/api/v1`. See [OpenAPI](docs/api/openapi.yaml) and generated [TypeScript contracts](packages/api-contracts/src/generated.ts). `npm run contracts` regenerates both from `infrastructure/scripts/write-openapi.mjs`; the shared Zod schemas validate user responses and forms and are checked against the generated user type.

Implemented modules: web/native authentication, verification email/recovery, own sessions, current user/profile, academic catalog/onboarding, affiliation submissions, administrator review, private profile media. Detailed route inventory is available using `php artisan route:list --path=api/v1`.

Successful resources use `{data: ...}`, validation errors `{message, errors}`, standard failures `{message}`. Logout and revocation use 204. Administrator queues use Laravel's page-based pagination (20 items); social feeds use cursor pagination. Responses from public profiles omit email, system role, approval internals and hidden academic metadata.

Mutation requests on web require CSRF. GET private endpoints require authentication; campus/profile/review additionally require verified email and approved affiliation. Media `/media/profiles/{userId}/{filename}` is outside `/api/v1`, private/no-store, with same-campus and current-path checks. It does not expose arbitrary storage files.

The OpenAPI describes implemented identity, social and in-progress campus operations. Some catalog/review/session response structures are documented narratively rather than fully generated models; expanding schema coverage is required before the native/social modules.


## Activity and search follow-up, 2026-10-16

`GET /api/v1/search/topics?q=...&cursor=...` returns `{data: [{name, posts_count}], next_cursor}` with 20 alphabetical topics per page. Query is optional, max 80 characters; leading # is ignored and SQL wildcard characters are literal. Counts include historical posts currently visible to the authenticated campus member and exclude muted authors. It does not disclose private/blocked posts.

`GET /api/v1/notifications` remains a flat cursor list with underlying unread counts; optional nullable `follow_state` is the current incoming relationship state. Web groups loaded entries by kind/destination/day, deduplicates page overlaps and marks underlying owned IDs read. Detailed moderation and verification decisions remain individual.

DM retry reuses the original `client_id` and body; changing the draft creates a new request identity. Successful responses update the message cache, while date separators and send failure/retry are presentation only. Existing PostgreSQL uniqueness and permission checks remain authoritative. No migration is required for this update.
