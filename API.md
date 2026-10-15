# API

Prefix `/api/v1`. See [OpenAPI](docs/api/openapi.yaml) and generated [TypeScript contracts](packages/api-contracts/src/generated.ts). `npm run contracts` regenerates both from `infrastructure/scripts/write-openapi.mjs`; the shared Zod schemas validate user responses and forms and are checked against the generated user type.

Implemented modules: web/native authentication, verification email/recovery, own sessions, current user/profile, academic catalog/onboarding, affiliation submissions, administrator review, private profile media. Detailed route inventory is available using `php artisan route:list --path=api/v1`.

Successful resources use `{data: ...}`, validation errors `{message, errors}`, standard failures `{message}`. Logout and revocation use 204. Administrator queues use Laravel's page-based pagination (20 items); social feeds will use cursors when implemented. Responses from public profiles omit email, system role, approval internals and hidden academic metadata.

Mutation requests on web require CSRF. GET private endpoints require authentication; campus/profile/review additionally require verified email and approved affiliation. Media `/media/profiles/{userId}/{filename}` is outside `/api/v1`, private/no-store, with same-campus and current-path checks. It does not expose arbitrary storage files.

The OpenAPI describes implemented identity, social and in-progress campus operations. Some catalog/review/session response structures are documented narratively rather than fully generated models; expanding schema coverage is required before the native/social modules.
