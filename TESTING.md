# Testing and evidence

Testing targets only synthetic data. `php artisan test` uses SQLite memory; `npm run test:postgres` directly invokes PHPUnit with the PostgreSQL extension against `ruang_test` only. Do not point RefreshDatabase at a live database.

API suites cover registration/password hashing/privilege fields, email signature ownership/expiry, login/logout, recovery privacy/revocation, native scope/expiry/revocation, campus gating, cross-institution onboarding/review, role assignment, audited review/self-review denial, duplicate review, profile visibility/unsafe links, image validation/private access, foreign sessions and independent rate limits. Three additional administration cases verify institution scoping, trusted-CLI bootstrap and insufficient token ability.

Browser tests run against local dev PostgreSQL and Laravel/Next.js servers. They verify responsive light/dark landing and keyboard skip link; form/server errors; cookie login/CSRF rejection; persisted profile reload; full registration/signed-email/onboarding/admin review; cross-browser session revocation; browser image upload, invalid SVG and anonymous image rejection. The email fixture obtains a short-lived signed link only for synthetic `e2e_*` usernames and refuses non-local app environments. It does not prove SMTP delivery.

`accessibility.spec.ts` uses axe WCAG 2.1 AA rules on public pages; this automated check is not a complete manual accessibility certification. Screenshots under `docs/testing/screenshots` are actual browser captures. Screenshot inspection and assertions are separate from compilation/build checks.

Run:

```powershell
npm.cmd run test:api
npm.cmd run test:postgres
npm.cmd --prefix apps/web run test:e2e
npm.cmd --prefix apps/web run lint
npm.cmd --prefix apps/web run typecheck
npm.cmd run build:web
node infrastructure/scripts/validate-config.mjs
```

Current results and limitations are in PROGRESS.md. GitHub-hosted API/web/mobile CI has run successfully. Fresh API regressions passed 65 tests / 419 assertions on SQLite and isolated PostgreSQL, including four operational-check cases. Full browser regression passed 13 tests against a production Next build, disposable PostgreSQL, real API, queue and Reverb: https://github.com/mhmdhabibrafi/simeyo/actions/runs/38695391771. Browser CI separates test files by a full authentication rate window instead of disabling throttles; theme contrast checks wait for CSS transitions to finish. Private WSS delivery and cross-user channel denial passed through the HTTPS/FPM gateway. HIGH/CRITICAL image scanning passed without suppression: https://github.com/mhmdhabibrafi/simeyo/actions/runs/38695738478. These results do not establish physical push delivery or a public production deployment.

Manual GitHub workflows exercise Android installation, iOS simulator builds, complete browser acceptance, release-image auditing and supporting-service protocols. They use only isolated fictional fixtures and do not publish application images or deploy. Native acceptance and sustained load must be checked against their actual run results in PROGRESS.md, not inferred from compilation or a workflow file. Traces, signed-link mail and runtime logs remain private; only selected fictional screenshots and redacted result JSON are retained.
