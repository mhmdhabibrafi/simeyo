# Production-shaped release configuration

`docker-compose.production.yml` is separate from the existing development stack and local Windows runtime. It builds an immutable Next.js standalone image and a PHP-FPM image with OPcache, runs queue/Reverb processes, stores private media on a named volume, and serves one HTTPS origin through Nginx. Only the gateway binds a host port, on loopback. It expects an operator-managed PostgreSQL database and TLS certificate. Nothing here publishes images or deploys publicly.

Copy `.env.example` from this directory to an ignored root `.env.production`. Supply persistent keys, database credentials, SMTP and real certificate paths. Never generate a replacement `APP_KEY` on an existing installation. Match `SITE_HOST`, `PUBLIC_ORIGIN`, `PUBLIC_TLS_PORT` and `STATEFUL_DOMAIN`: for standard HTTPS use `campus.example`, `https://campus.example`, `443`, `campus.example`; for an isolated 8443 test use `localhost`, `https://localhost:8443`, `8443`, `localhost:8443`. Default ports must be omitted from the canonical origin/stateful hostname. Keep external database TLS verification and certificate trust appropriate to the database provider.

Review the rendered configuration without logging secrets:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml build api web
```

Before any operator-approved deployment, make a verified database/media/key backup. Apply additive migrations once as an explicit release step, without seeders. The API image does not automatically migrate, seed or generate application keys. Start/recreate API, web, worker, Reverb and gateway together for a version change. OPcache timestamp validation is disabled because source is immutable inside the image; replace containers to update code. Workers have a bounded lifetime and restart policy. Avoid parallel migration processes; retain a rollback image and check schema compatibility before rolling back application code.

Private media uses the named volume; do not remove it or share it with unrelated installations. The production namespace is separate from the previous development namespace. Do not point this stack at an existing database until its credentials, backups, migration plan and authorization have been reviewed. See [backup and restore](../../docs/operations/backup-restore.md).

The gateway terminates TLS and sets the FastCGI HTTPS flag directly. PHP-FPM, the Next server and the Reverb publication endpoint have no published host ports. The `/app/` WebSocket endpoint is proxied through TLS; private channel authorization remains in Laravel. No wildcard trusted-proxy setting is introduced. The supplied binding is local-only: opening public ingress still requires explicit authorization and operator firewall/TLS/hostname configuration.

The CI override adds only a disposable PostgreSQL database. `test-production-stack.sh` generates ephemeral test certificates/keys, builds images, migrates the isolated CI database, supplies fictional accounts only through a separate testing-mode command, and checks HTTPS, CSRF, secure cookies, login/logout, private response headers, feeds and the public realtime configuration. The actual API remains in production mode. The CI fixture must never be used to seed a real environment.

Container smoke acceptance is narrower than production readiness: physical push, production SMTP/media/key recovery, sustained load, WebSocket delivery through the gateway, monitoring, resource limits and dependency remediation require separate acceptance. See PROGRESS.md for actual run results; do not treat this configuration as a completed v1.0.0 release.
