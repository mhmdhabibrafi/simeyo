# Firebase campus sign-in and direct application entry

Implementation: 93ffcef; direct entry: 840d6e4; production file-permission fix and deployed source: 59931f8.

## Actual verification

- Local PHP: 78 tests / 507 assertions passed on isolated in-memory SQLite. RSA tests use runtime-generated keys and fake Google certificates. Windows PHP required the installed OpenSSL configuration through `OPENSSL_CONF`.
- Covered signed student/staff identities, exact domains, wrong audience/issuer/provider, expired/stale/unverified claims, forged signatures, disabled provider, suspension, and invalidation of credentials belonging to an unverified preregistered account.
- Web lint, type generation/TypeScript and production build passed. Shared contracts: 3 tests passed. Web production dependency audit: zero vulnerabilities; five existing development findings remain. The SDK's transitive gRPC dependency is overridden to a patched compatible major version.
- Focused real browser/API acceptance: [38727820113](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38727820113), 5 tests passed / 10.6 seconds. Includes two-browser/native-token password revocation, availability states, pending registration, Firebase option rendering and root-to-login/mobile layout. The earlier pre-direct-entry run passed 4 tests.
- Public deployment passed HTTPS/security checks, root 307, browser navigation to login, rendered Google button, light/dark mobile layout without horizontal overflow, zero browser errors, public-icon integrity and the private-data-safe offline fallback. Fresh public screenshots were visually inspected. See [redacted results](results/firebase-public-smoke-2026-10-15.json).
- Production Firebase endpoint returned 419 without CSRF and 422 with a CSRF-protected fake token. No production account was created for these probes. Server retrieval of Google's certificates returned HTTP 200 and four valid public keys with normal TLS verification.
- The production Google button successfully opened the real `accounts.google.com` account chooser. No Google credentials were entered and no real campus-account sign-in is claimed.
- The earlier production image could not read newly copied files from an umask-077 checkout. Its migration attempt failed before execution. After the Dockerfile permission fix, the additive migration succeeded. Database backup preceded migration. Existing database/application secrets, users, media and other server applications were preserved.
- Production internal verified TLS, secure session cookies, protected-route denial, actual WebSocket handshake and worker queue probe passed; zero ready/failed jobs.

## Outstanding verification at this checkpoint

Standard [59931f8 checks](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38728150742) passed all four jobs: API/PostgreSQL, web, mobile and the production-shaped stack. The [full browser regression](https://github.com/mhmdhabibrafi/simeyo/actions/runs/38728251898) passed all 18 tests. These results precede the subsequent consumer feed redesign.

Real campus Google-account exchange, native Google sign-in, physical push, email delivery and off-host recovery remain unverified. This change does not constitute v1 release acceptance.
