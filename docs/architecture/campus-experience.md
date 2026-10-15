# Campus experience implementation checkpoint

Campus features extend the v0.2 foundation; v0.3 is not declared until its complete acceptance gate passes.

## Spaces and discovery

Communities have institution, owner, optional validated faculty/department, rules and campus/private visibility. Public metadata permits discovery of private groups; posts/events require active membership. Joining private communities creates pending membership. Managers accept/remove ordinary members; only the owner promotes/demotes moderators. No client role assignment or ownership spoofing is accepted. Owner deletion is soft and hides contained posts/events, including their transitive quoted/replied dependencies.

Official organization verification requires a separately reviewed organization-manager owner and institution-scoped administrator decision. Ordinary members cannot assign verified status.

Campus events persist title, description, location and start/end instants, with chronological keyset pagination and unique going/interested RSVP. Community event creation requires management membership. Calendar inputs convert device-local time to ISO instants. UI displays device-local time; no fake attendance counts are used.

Hashtags are normalized lowercase Unicode identifiers (2–40 characters); mentions reference existing visible same-campus members. Twenty entities per type bound processing cost. Edits refresh indexes; newly mentioned members receive notifications. `php artisan ruang:index-post-entities` refreshes existing posts without historical notification spam.

Search uses parameterized PostgreSQL/SQLite database queries and authoritative post visibility. Literal wildcard escaping uses explicit SQL ESCAPE. Meilisearch runtime is not available or claimed as tested; the database implementation is functional without it.

Campus Pulse counts accessible, unmuted stories from the last 24 hours. Popular stories sort by actual likes then newest immutable ID. The UI and API expose the ranking explanation. For You continues the documented social-core ranking; user suggestions are recent verified campus accounts not already followed/muted, with an explicit explanation.

## Communications

Direct conversations use a canonical ordered user pair, unique participants and immutable message cursor IDs. Every endpoint checks participation, institution, verification and bilateral blocking. Recipient policy: campus, accounts the recipient follows, or nobody; private accounts always require the recipient to follow the sender. Existing history remains accessible if only the DM preference changes; blocking/suspension removes access. Message retry UUID is unique per sender; reuse for different content/conversations returns 409. Read watermark comes from the server and cannot move backwards.

Notifications persist synchronously using Laravel database notifications, separate from queued broadcast delivery. Indexed actor/post/conversation references apply current permissions before pagination and unread counting; actor records are loaded in one batch. Self-activity and duplicate PUT interactions do not generate notifications. User preferences suppress future selected categories. No message body enters activity notifications or websocket payloads.

Laravel Reverb uses private `App.Models.User.{id}` channels authorized through `/api/v1/broadcasting/auth` with API/Sanctum/campus middleware and CSRF for web cookies. The event payload is only `{refresh:true}`; clients fetch authorized data. Pusher JS reconnect invalidates caches; foreground HTTP polling supports offline Reverb. Production requires TLS and separately configured origin/endpoint/queue supervision.

Local services: `node infrastructure/scripts/local-realtime.mjs` and the same command with `worker`. The helper guards APP_ENV=local, binds loopback and preserves existing generated local signing credentials. These commands do not validate Docker, Redis, MinIO, Meilisearch or public deployment.

## Moderation

Moderator/administrator report queues are institution-scoped. Pending reports can be dismissed or the post soft-deleted; only administrators can suspend ordinary members. Self-review and suspension of privileged reviewers are prohibited. Suspension revokes sessions/native tokens. Decisions record required reason, actor, subject, report/post IDs and timestamp transactionally in audit logs. Community organization review has its own admin-only audited endpoint.

## Remaining verification / limitations

- Campus UI/moderation acceptance and full browser regression passed 13 tests before Phase 4. Organization verification has API coverage. See PROGRESS.md for actual results; broader race/load tests remain production work.
- Community ownership transfer is not implemented; owners can delete rather than abandon a space. The event composer selects managed communities by name with pagination.
- Docker Engine and supporting services remain untested. Local Reverb browser delivery is tested independently.
- Expo browser acceptance and production PWA acceptance passed. Physical push delivery, native builds and production/load/backup acceptance remain Phase 4 and v1 work; see MOBILE.md.
