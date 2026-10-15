#!/bin/sh
set -eu
[ "${CI:-}" = true ] && [ "${GITHUB_ACTIONS:-}" = true ] || { echo 'This script is restricted to disposable GitHub CI runners.' >&2; exit 1; }
# Compose prioritizes inherited shell values over --env-file. Never inherit a real deployment target.
unset SITE_HOST PUBLIC_TLS_PORT GATEWAY_BIND_PORT PUBLIC_ORIGIN STATEFUL_DOMAIN IMAGE_TAG SIMEYO_PRODUCTION_ENV_FILE APP_KEY
unset DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD DB_SSLMODE REVERB_APP_KEY REVERB_APP_SECRET
unset TLS_CERT_FILE TLS_KEY_FILE MAIL_MAILER DEMO_PASSWORD EXPO_PUSH_ENABLED
umask 077
mkdir -p .local/production-ci
state=$(CDPATH= cd .local/production-ci && pwd)
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout "$state/key.pem" -out "$state/cert.pem" -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' 2>/dev/null
environment="$state/.env.production"
cat > "$environment" <<EOF
SITE_HOST=localhost
PUBLIC_TLS_PORT=8443
PUBLIC_ORIGIN=https://localhost:8443
STATEFUL_DOMAIN=localhost:8443
IMAGE_TAG=ci
SIMEYO_PRODUCTION_ENV_FILE=$environment
APP_KEY=base64:$(openssl rand -base64 32)
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=simeyo_production_ci
DB_USERNAME=simeyo_ci
DB_PASSWORD=$(openssl rand -hex 24)
DB_SSLMODE=disable
REVERB_APP_KEY=$(openssl rand -hex 16)
REVERB_APP_SECRET=$(openssl rand -hex 32)
TLS_CERT_FILE=$state/cert.pem
TLS_KEY_FILE=$state/key.pem
MAIL_MAILER=log
DEMO_PASSWORD=$(openssl rand -hex 18)
EOF
compose() { docker compose --env-file "$environment" -p simeyo-ci -f docker-compose.production.yml -f infrastructure/production/compose.ci.yml "$@"; }
resource_pid=
cleanup() {
  [ -z "$resource_pid" ] || kill "$resource_pid" 2>/dev/null || true
  compose down --remove-orphans
}
trap cleanup EXIT
compose config --quiet
compose build api web postgres
compose up -d postgres api web reverb
compose exec -T api php artisan migrate --force
# Only the ephemeral CI database gets fictional accounts; the running API stays production.
compose exec -T -e APP_ENV=testing api php artisan db:seed --class=DevelopmentSeeder --force
compose up -d worker gateway
ready=false
for attempt in $(seq 1 60); do
  if curl --silent --fail --cacert "$state/cert.pem" https://localhost:8443/api/v1/health >/dev/null; then ready=true; break; fi
  sleep 2
done
[ "$ready" = true ] || { echo 'Production-shaped stack did not become healthy.' >&2; exit 1; }
compose exec -T gateway nginx -t
BENCH_PASSWORD=$(sed -n 's/^DEMO_PASSWORD=//p' "$environment") NODE_EXTRA_CA_CERTS="$state/cert.pem" node infrastructure/scripts/verify-production-stack.mjs
BENCH_PASSWORD=$(sed -n 's/^DEMO_PASSWORD=//p' "$environment") node infrastructure/scripts/verify-production-realtime.mjs
compose exec -T api php artisan simeyo:operations-check --probe-queue
compose stop worker
if compose exec -T api php artisan simeyo:operations-check --probe-queue --wait=1; then echo 'Stopped worker was incorrectly reported healthy.' >&2; exit 1; fi
compose up -d worker
compose exec -T api php artisan simeyo:operations-check --probe-queue
BENCH_ORIGIN=https://localhost:8443 BENCH_EMAIL=nadia@example.test BENCH_PASSWORD=$(sed -n 's/^DEMO_PASSWORD=//p' "$environment") NODE_EXTRA_CA_CERTS="$state/cert.pem" node infrastructure/scripts/benchmark-local-api.mjs > "$state/api-sample.json"
cat "$state/api-sample.json"
compose cp infrastructure/scripts/seed-production-load.php api:/tmp/seed-production-load.php
compose exec -T -e CI=true -e GITHUB_ACTIONS=true api php /tmp/seed-production-load.php > "$state/query-plan.json"
(while true; do docker stats --no-stream --format '{{json .}}' $(compose ps -q); sleep 5; done) > "$state/resources.jsonl" &
resource_pid=$!
BENCH_PASSWORD=$(sed -n 's/^DEMO_PASSWORD=//p' "$environment") NODE_EXTRA_CA_CERTS="$state/cert.pem" node infrastructure/scripts/load-production-stack.mjs > "$state/sustained-load.json"
kill "$resource_pid" 2>/dev/null || true
resource_pid=
cat "$state/sustained-load.json"
echo 'Isolated production-shaped stack passed. No image publication or public deployment performed.'
