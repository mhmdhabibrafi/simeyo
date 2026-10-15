# Mediasi server installation — 2026-10-15

The owner authorized setup on the existing Mediasi server and public hostname **https://simeyo.mhmdhabibrafi.me**. This is a release-candidate web installation, not a declaration of completed v1.0.0 acceptance.

Source is checked out under `/srv/simeyo/app`. `/srv/simeyo/compose` selects the production, dedicated-database and private server overrides. Persistent production configuration is mode 0600 in the checkout; origin keys, the email-unavailable gateway override and operational evidence are in `/srv/simeyo/private` (0700). No secrets are committed. Preserve the existing application key, database credentials and volumes during updates.

Six containers run with restart policies: Next standalone web, PHP-FPM API, database queue worker, Reverb, Nginx and PostgreSQL 17. Only the gateway binds a host port, **127.0.0.1:18443**. Database and private media use separate `simeyo-production` volumes. The application database role has no SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS. A separate passwordless bootstrap administrator is reachable through the trusted local container socket, not host-password authentication. Existing WordPress and Ollama installations were preserved.

Cloudflare's existing tunnel gained one hostname before its catch-all. Previous ingress configuration was backed up. The origin uses a private CA, hostname verification and `caPool`; TLS verification is enabled. The origin leaf expires after one year and must be renewed before 2027-10-15. Public client URLs use port 443 while the origin binding uses 18443. Restarting cloudflared briefly interrupts tunnel SSH; prefer a verified LAN session or a recovery console for future tunnel maintenance.

Actual acceptance: 12 migrations applied, reference institution catalog initialized without demo users, CA-verified internal HTTPS/security/cookie/CSRF checks passed, WebSocket handshake passed, and the worker heartbeat passed with zero ready/failed jobs. Initial database backup passed archive-inventory validation. This is not a restore or off-host recovery drill. Public HTTPS checks passed via Cloudflare DNS-over-HTTPS resolution; the local OS resolver still cached the earlier NXDOMAIN. Fresh 390-pixel login screenshots in both themes were inspected, with no horizontal overflow or JavaScript page errors. Redacted public results: [server-public-smoke-2026-10-15.json](../testing/results/server-public-smoke-2026-10-15.json).

SMTP is unavailable, as confirmed by the owner. The private Nginx template returns explicit JSON 503 for forgot-password and verification-email resend; password registration is open but remains pending until verified. Mail uses the non-delivering array driver as a defensive fallback; no signed email links are logged. Login remains enabled. The requested owner account was provisioned without inventing email verification or campus approval; real server cookie login/me/logout passed through internal verified TLS and through a browser at the public HTTPS origin. Post-logout access returned 401; the test confirmed email/admin approval remains pending. See [redacted owner authentication results](../testing/results/server-public-owner-auth-2026-10-15.json). The initial password is restricted to the operator's private server directory and was delivered directly to the owner. No local demo password/account was copied into this installation. A second database backup includes the provisioned account and passed archive-inventory validation.

Useful trusted-access checks:

```sh
/srv/simeyo/compose ps
/srv/simeyo/compose exec -T api php artisan simeyo:operations-check --probe-queue
```

To enable email, configure and test real SMTP in the private environment, replace the private Nginx template with the reviewed repository template to remove the temporary email guard, then recreate API/worker/Reverb/gateway using the wrapper. Re-run actual delivery, verification and recovery acceptance before inviting campus users. Administrator promotion must use the existing reviewed-membership CLI procedure; provisioning alone does not grant approval.

Open gates include verified first administrator/affiliation, SMTP, native device/push/store acceptance, remaining development dependency advisories, off-host encrypted backups and restore, retention and independent review procedures, external alerts and agreed production capacity. Do not seed development fixtures, reset the database, remove volumes, regenerate application keys or publish a v1 tag to resolve these gates.


## Firebase and direct app entry update, 2026-10-15

Source 59931f8 was built and deployed as `firebase-sso-59931f8`. The API image now normalizes read permissions for source copied from a private umask-077 checkout; the initial migration attempt on the earlier image failed with permission denied before any migration ran. After rebuilding, the additive identity migration succeeded. The pre-migration database backup is `pre-firebase-sso-840d6e4.dump` under the existing private backup directory. No data reset or development fixture was performed.

Firebase public project identifiers are in the private API environment; no service-account secret is needed for public-certificate token verification. Google provider and authorized-domain setup is being performed by the owner. Public browser checks prove the Google button is rendered, not that a real campus Google account has completed sign-in. Automatic Google approval does not grant administrator status. Existing password credentials of unverified accounts are invalidated when their real email owner links Google; continue using Google after linking.

The registration endpoint was removed from the temporary Nginx guard. An empty request without CSRF correctly returns 419. Forgot-password/email-resend remain 503 until delivery is configured and tested. `/` returns 307 to `/home`; the browser reaches `/login` without a session. The compact monochrome login passed public mobile/light/dark, offline fallback, icon integrity and zero browser-error checks. Internal TLS, secure cookies, API/database health, protected-route rejection, actual WSS handshake and queue worker probe passed. [Public redacted results](../testing/results/firebase-public-smoke-2026-10-15.json).


## Latest consumer presentation deployment

Bottom-menu follow-up: source 6b33ab8 is deployed as `consumer-6b33ab8`. Both images built successfully; only web/gateway were recreated, with a private environment rollback snapshot retained. Six fixture-based UI tests against the public assets passed (27.7 seconds), including the bottom-left/upward popup at 620px height and navigation collapse/expand. The screenshot was inspected. Trusted internal HTTPS/security/health checks and actual WSS handshake passed. No migration, seeding or production account mutation accompanied this update.

UI source 34412db is deployed as `consumer-34412db`. API images were also built under that tag for future Compose consistency; only web and gateway were recreated. The API/worker/Reverb containers retain the working Firebase release code and existing database/media volumes. Private environment snapshots and previous immutable images remain available for rollback. No migration or seeding accompanied this presentation update. Public-backed fictional UI probes passed 6 tests / 20.7 seconds; trusted internal TLS/security/WSS checks passed. The latest full real-API browser and standard checks remain running at the recorded checkpoint; see the consumer UI test report for links and exact scope.
