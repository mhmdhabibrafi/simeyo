# Authentication

Web uses first-party Laravel sessions through Sanctum. Next.js rewrites `/api/*`, `/sanctum/*`, `/media/*` to Laravel. Browser writes first obtain `/sanctum/csrf-cookie`, then send decoded `XSRF-TOKEN` in `X-XSRF-TOKEN`, with credentials included. The session cookie is HttpOnly; no access token is stored in localStorage. localStorage holds only theme preference.

Cookie SameSite is Lax, session lifetime 120 minutes of inactivity, browser-close expiration follows Laravel defaults. Secure cookies must be enabled under HTTPS. CORS permits only the configured `FRONTEND_URL`, with credentials; Sanctum stateful domains must include the first-party host and port. Clients without first-party Origin/Referer use bearer authentication. API errors return JSON even for anonymous requests without an Accept header.

Passwords require 12 characters, upper/lower case and a number; Laravel Bcrypt handles hashing. Login and registration regenerate session IDs. Logout invalidates the session and regenerates CSRF state. Recovery messages do not disclose whether an email exists; successful reset deletes all database sessions and native tokens. Own web sessions can be listed/revoked; payloads and IP addresses are not returned. Named rate limiters isolate auth, reads, verification submission, resend and media operations.

Email verification uses owner-bound hashed email and an expiring signed URL. Default local mail is logged. SMTP delivery to a real mailbox is not verified. URLs require the same hostname Laravel signs; local links use `http://localhost:8000`, while the UI is on port 3000. Production should serve Laravel paths under the same public origin through a trusted reverse proxy and configure APP_URL accordingly.

Native `/auth/native/login` issues a 30-day token with the `campus` ability. Store it in Expo SecureStore when the native client is implemented. `/auth/native/logout` revokes the current bearer token. The token endpoint is API-tested; an Expo client is not yet implemented. Campus access also requires approved membership and email verification, regardless of token validity.

Affiliation methods: manual review for students/lecturers/alumni/organizations, or institutional email for **students only**, with explicit institution email-domain and auto-approval configuration. The initial institution has no assumed domain or auto approval. Pending/rejected/suspended users cannot access private campus endpoints.

The first administrator can be assigned by a trusted server operator **after independently reviewing affiliation**, on an already email-verified, onboarded account:

```sh
php artisan ruang:grant-admin person@example.org --confirm-reviewed
```

`--super` assigns a super administrator. The command writes a CLI-origin audit entry. Registration/profile endpoints never accept role updates. Administrators review their institution only; super administrators may review other campuses. Self-review is denied.
