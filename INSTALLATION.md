# Installation

Follow the Windows commands in README. `npm run setup:env` only creates absent env files and generates random credentials. `dev:db` writes project-local database settings and creates `ruang` and `ruang_test` only when absent; it never drops data. Its optional helper dependency uses packaged PostgreSQL binaries and must permit its install script. Existing PostgreSQL installations can instead be configured directly in `apps/api/.env`.

PHP's `-d extension=pdo_pgsql` affects only the invoked process. `artisan serve` starts another PHP process and does not inherit this flag. The root `dev:api` script starts PHP's server directly from the public directory so the driver and Laravel router both work. Linux/Docker PHP enables the driver in the image and can use `php artisan serve`.

## Docker development

Docker is not available on the current machine; the Compose stack has not been run. Configuration is provided for independent verification:

```sh
npm run setup:env
docker compose config
docker compose up -d --build
docker compose exec api php artisan migrate
docker compose exec api php artisan db:seed --class=InstitutionSeeder
```

Optional services:

```sh
docker compose --profile storage --profile search --profile workers up -d
```

The optional `realtime` profile starts the installed Reverb server. Set random `REVERB_APP_KEY` and `REVERB_APP_SECRET` in root `.env` before enabling it. Application realtime subscriptions/events are a Phase 3 task and are not implemented yet.

Root `.env` must contain random PostgreSQL, MinIO and Meilisearch keys. All published ports bind to loopback. Demo seeding is explicit, local/testing-only, and requires a random `DEMO_PASSWORD` in `apps/api/.env`:

```sh
docker compose exec api php artisan db:seed --class=DevelopmentSeeder
```

Mailpit is at http://localhost:8025. MinIO is opt-in; create a **private** bucket before setting `MEDIA_DISK=s3`, `AWS_ENDPOINT=http://minio:9000`, `AWS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION=us-east-1`, and `AWS_USE_PATH_STYLE_ENDPOINT=true` in API env. No object-storage or Redis service round trip has been verified on this host.

Do not run `migrate:fresh`, remove Docker volumes, overwrite existing env, or seed an existing production database. The Compose setup is development infrastructure, not a production deployment.
