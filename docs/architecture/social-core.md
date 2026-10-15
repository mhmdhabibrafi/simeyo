# Social core design (Phase 2)

Laravel owns posts, graph and visibility. Existing authentication/profile routes and staged foundation remain intact. Campus access is still Sanctum + verified email + approved membership.

Posts belong to one institution/author; immutable parent/root IDs model reply ancestry, quote IDs reference another post. Soft deletion retains thread structure while hiding deleted bodies/media. Media is private, owned, JPEG reencoded, and cannot be attached to another user's post. Unique compound keys protect likes, reposts, bookmarks and graph edges. Follow edges are accepted or pending; private targets require acceptance. Blocks are bilateral access denials and remove graph edges; mutes affect discovery rather than direct authorization.

Every read/write/media route applies the same visibility service: same institution, approved author, private-account/follower audience, bilateral block, and accessible live ancestor/quote chain. Counts never authorize content. Deleting or restricting a quote source makes its quoted content inaccessible. No raw HTML rendering.

Campus/Following/profile/reply feeds use immutable-ID keyset pagination. For You ranks actual visible posts from a bounded recent candidate window using recency, engagement and accepted follows; its ordered candidate IDs are frozen in a short-lived per-user database snapshot so likes/new posts cannot reorder an existing cursor. Each page rechecks current permissions. Cursor is encrypted and owner-bound. Campus remains the complete chronological timeline beyond the recommendation window.

UI uses shared post cards, composer, thread pages and TanStack infinite queries. Optimistic interactions serialize per control, update cached items, and roll back on failure; server PUT/DELETE interactions are idempotent. No like/repost/bookmark/follow counts are hardcoded.

Phase gate: real PostgreSQL API/privacy tests, foundation regressions, browser social flows and rollback, media access, cursor stability, accessibility/responsive screenshots, lint/typecheck/build, accurate documentation and release status.
