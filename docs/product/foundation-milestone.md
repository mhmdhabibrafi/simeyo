# Foundation milestone

Simeyo's first milestone implements the identity boundary for a private campus community. Web accounts register with normalized email/username, receive signed verification mail, complete institution onboarding, and request affiliation review. Trusted administrators make institution-scoped decisions with an audit trail. Institutional email approval is opt-in and restricted to configured student domains.

Members can edit display identity, bio, links, interests, location and academic visibility, upload validated/reencoded private avatar/cover images, and manage web sessions. Native authentication endpoints issue scoped, expiring tokens. The responsive web interface covers landing, login, register, recovery/reset, onboarding, verification, foundation home, profile/edit, settings, review queue and errors.

Actual PostgreSQL persistence and browser workflows are required evidence. The social-feed placeholder explicitly identifies upcoming features; it is not presented as an implemented feed. Threads, interactions, follows, communities, direct messages, realtime notifications, PWA, Expo and production readiness remain subsequent milestones.

Verification proves only the implemented review process; a real operator must independently establish membership. No official university endorsement, identity-system integration or real student data is assumed. Docker/Redis/MinIO/Reverb infrastructure configuration does not imply runtime service verification.
