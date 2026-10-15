# Social core milestone

Implemented: text/image posts, owner edit/delete, twelve-level reply hierarchy, quote dependency checks, idempotent like/repost/bookmark operations, accepted/pending follows, private requests, bilateral blocks, mutes, reports, profile/reply/media feeds, authenticated media viewer, responsive composer/post cards, user discovery/search and relationship lists.

Campus and Following timelines use descending immutable post ID cursors. A profile timeline includes visible reposts; reposts preserve the original post chronology rather than creating duplicate copies. For You uses a 7-day/1000-candidate window and scores actual engagement + recency + accepted follows; candidate order is frozen for 15 minutes, while visibility is rechecked at every page. Expired snapshots return 410 and offer refresh. No SQL OFFSET is used in social feeds.

Privacy is enforced in Laravel queries, direct post routes, uploads/media, profile reads and graph routes. Transitive parent/quote dependencies prevent indirect access to inaccessible/deleted sources. Unverified/suspended members and other institutions cannot bypass campus policies through direct API calls. Private repost activity is hidden from nonfollowers. Database unique keys protect repeated interactions.

Optimistic UI captures explicit click intent before mutating cached state, serializes operations per post, rolls back failed fields, and takes authoritative server values on success. Browser tests distinguish optimistic feedback from durable server acknowledgement before testing reload persistence. Reply/quote composer inputs use unique React IDs.

Development-only fictional stories are available with `php artisan db:seed --class=SocialDevelopmentSeeder`; existing identities/profiles are not overwritten. Tests seed synthetic `e2e_*` members directly under a local-only fixture guard. Production receives no seeded demo credentials/content.
