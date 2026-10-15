# Security status

Implemented and API-tested: password hashing/validation, session rotation/logout, recovery token validation, session/token revocation, native token expiry/scope, rate limiting, email-owner/hash/signature/expiry, membership gating, institution-scoped review, denial of self-review and privilege mass assignment, academic visibility, safe profile URLs, media type/dimension/size validation and metadata-free encoding. Browser testing covers CSRF rejection and persisted cookie login.

Profile text renders as React text; no raw HTML rendering. Profile links accept only HTTP/HTTPS and external links use noopener. Images stay private; Next Image uses `unoptimized` because the image optimizer cannot carry the viewer's session cookie and must not create a shared cache of private images. Media responses are private/no-store. Native credentials must later use SecureStore, not AsyncStorage.

No institutional credentials, real student records, document uploads or production secrets are embedded. `.env`, `.local`, runtime databases, tokens and logs are ignored. Test artifacts may include short-lived signed URLs/session cookies; Playwright traces and HTML reports are ignored and must not be publicly published. Fictional screenshots may be retained as evidence.

Manual verification is an operator-reviewed **statement**, not cryptographic proof of affiliation. Operators must define an independent verification procedure before opening to real campus users. Self-claimed faculty/department choices are contextual metadata, not role grants.

Production remains gated. SMTP delivery, Docker stack, S3, Redis, full threat review, load tests, account-retention/deletion, monitoring, backup/restore and native-device testing are not verified. The installed web development tooling reports five high dependency advisory entries through ESLint/fast-glob/micromatch/braces; do not use force upgrades or claim a clean full dependency audit. Check the runtime-only audit separately and track remediation before v1.0.0.
