# Simeyo API

Laravel/Sanctum identity foundation, v0.1.0. See root [README](../../README.md), [API](../../API.md), [AUTHENTICATION](../../AUTHENTICATION.md) and [PROGRESS](../../PROGRESS.md).

On Windows use root `npm.cmd run dev:api` to enable the PostgreSQL driver on the actual serving process. SQLite tests: `php artisan test`. PostgreSQL tests: root `npm.cmd run test:postgres`, against the isolated test database only. Do not run destructive reset/seed operations against production data.
