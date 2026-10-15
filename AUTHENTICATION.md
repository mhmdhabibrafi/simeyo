# Authentication

## Firebase Google campus sign-in

Web login, registration and pending email verification offer Google sign-in when `FIREBASE_AUTH_ENABLED=true`. Configure `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_API_KEY` and `FIREBASE_APP_ID` in the API environment. These are public web identifiers, not a service-account key. Enable Google in Firebase Authentication and authorize the exact production hostname. No SMTP or Firebase database is required.

Laravel verifies RS256 signatures using Google's fixed public certificate endpoint, project audience/issuer, expiry, recent authentication, Google provider and verified email. Exact `students.uin-suska.ac.id` identities receive student membership; exact `uin-suska.ac.id` identities receive staff membership metadata (including lecturers/staff). Both receive approved campus membership. Domain text submitted through password registration grants no verification. Staff metadata grants no administrator privileges. Suspended/rejected accounts and conflicting identity bindings remain blocked.

`POST /api/v1/auth/firebase` accepts `firebase_token` under normal web CSRF protection and creates a Laravel session. Firebase browser persistence is memory-only; the SDK signs out after exchange. Tokens are not stored in the application database. Linking an existing unverified email account invalidates its old password, sessions, reset links and native tokens to prevent preregistration takeover. Existing verified-account credentials and privileged roles are preserved. Firebase token revocation checks and native Google sign-in are not claimed as implemented. This is Google account authentication, not access to an official university SSO or student database.

Apply the additive `firebase_identities` migration before enabling this provider. Tests use generated RSA keys and fake public certificates; actual Google campus-account acceptance and Firebase Console settings still require real-provider testing. On Windows PHP, set `OPENSSL_CONF` to the installed PHP OpenSSL configuration when running RSA tests.

Web uses first-party Laravel sessions through Sanctum. Next.js rewrites `/api/*`, `/sanctum/*`, `/media/*` to Laravel. Browser writes first obtain `/sanctum/csrf-cookie`, then send decoded `XSRF-TOKEN` in `X-XSRF-TOKEN`, with credentials included. The session cookie is HttpOnly; no access token is stored in localStorage. localStorage holds only theme preference.

Cookie SameSite is Lax, session lifetime 120 minutes of inactivity, browser-close expiration follows Laravel defaults. Secure cookies must be enabled under HTTPS. CORS permits only the configured `FRONTEND_URL`, with credentials; Sanctum stateful domains must include the first-party host and port. Clients without first-party Origin/Referer use bearer authentication. API errors return JSON even for anonymous requests without an Accept header.

Passwords require 12 characters, upper/lower case and a number; Laravel Bcrypt handles hashing. Login and registration regenerate session IDs. Logout invalidates the session and regenerates CSRF state. Recovery messages do not disclose whether an email exists; successful reset deletes all database sessions and native tokens. Own web sessions can be listed/revoked; payloads and IP addresses are not returned. Named rate limiters isolate auth, reads, verification submission, resend and media operations.

Email verification uses owner-bound hashed email and an expiring signed URL. Default local mail is logged. SMTP delivery to a real mailbox is not verified. URLs require the same hostname Laravel signs; local links use `http://localhost:8000`, while the UI is on port 3000. Production should serve Laravel paths under the same public origin through a trusted reverse proxy and configure APP_URL accordingly.

Native `/auth/native/login` issues a 30-day token with the `campus` ability. The Expo client stores it in device-only SecureStore. `/auth/native/logout` revokes the current bearer token. The token endpoint is API-tested; installed-device acceptance remains a separate gate. Campus access also requires approved membership and email verification, regardless of token validity.

Affiliation methods: manual review for students/lecturers/alumni/organizations, or institutional email for **students only**, with explicit institution email-domain and auto-approval configuration. The initial institution has no assumed domain or auto approval. Pending/rejected/suspended users cannot access private campus endpoints.

The first administrator can be assigned by a trusted server operator **after independently reviewing affiliation**, on an already email-verified, onboarded account:

```sh
php artisan ruang:grant-admin person@example.org --confirm-reviewed
```

`--super` assigns a super administrator. The command writes a CLI-origin audit entry. Registration/profile endpoints never accept role updates. Administrators review their institution only; super administrators may review other campuses. Self-review is denied.


## Registration policy and password changes

`GET /api/v1/auth/options` returns only registration/email-delivery availability and allowed domains. `REGISTRATION_EMAIL_DOMAINS` is an exact, normalized domain allowlist for new registrations; the production example uses `students.uin-suska.ac.id,uin-suska.ac.id`. Empty preserves unrestricted local development. Existing users can still log in after policy changes. Domain matches never grant email verification, affiliation approval, lecturer roles or administrator access.

`REGISTRATION_ENABLED=false` closes registration with JSON 503. `EMAIL_DELIVERY_ENABLED=false` still permits pending registrations, but dispatches no verification email and returns JSON 503 for recovery/resend. New accounts remain email-unverified and cannot access campus content. Set delivery true only after provider acceptance. An existing valid reset link remains usable; no new email is pretended to have been sent. Web registration, verification and recovery show the API availability state and disable unavailable email actions. Firebase Google campus sign-in is configured separately as documented above; SMTP delivery is still unavailable.

Authenticated users may `PUT /api/v1/me/password` with `current_password`, `password` and `password_confirmation`, without SMTP or prior campus approval. The current password is checked under a user-row lock. All native tokens (and their dependent push devices), other web sessions and pending reset links are revoked in one transaction. The current web session rotates its identifier/CSRF state and remains active; a native caller must log in again. Login binds web sessions to the password hash; native credential checks/token issuance serialize with rotation. Audit entries contain the actor and channel, never credentials. The route permits five attempts per user per minute. UI is under web Settings ? Ubah kata sandi and the equivalent native settings action.
