#!/bin/sh
set -eu
[ "${CI:-}" = true ] && [ "${PGDATABASE:-}" = ruang_test ] || { echo 'Recovery drill requires the isolated CI ruang_test database.' >&2; exit 1; }
directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
archive="/tmp/simeyo-recovery-$(date +%s)-$$.dump"
target=simeyo_restore_application_ci
psql --no-password -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO users (name,email,password,username,created_at,updated_at) VALUES ('Recovery fixture','recovery@example.invalid','disabled-login-not-a-password-hash','recovery_fixture',now(),now());
INSERT INTO user_profiles (user_id,bio,created_at,updated_at) SELECT id,'Pemulihan Simeyo — data uji kampus 🌱',now(),now() FROM users WHERE email='recovery@example.invalid';
SQL
sh "$directory/database-backup.sh" "$archive"
if sh "$directory/database-backup.sh" "$archive"; then echo 'Overwrite guard failed.' >&2; exit 1; fi
createdb --no-password "$target"
sh "$directory/database-restore.sh" "$archive" "$target"
rows=$(psql --no-password --dbname="$target" -XAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.email='recovery@example.invalid' AND p.bio='Pemulihan Simeyo — data uji kampus 🌱'")
[ "$rows" = 1 ] || { echo 'Restored application data differs.' >&2; exit 1; }
source_migrations=$(psql --no-password -XAt -c 'SELECT count(*) FROM migrations')
restored_migrations=$(psql --no-password --dbname="$target" -XAt -c 'SELECT count(*) FROM migrations')
[ "$source_migrations" = "$restored_migrations" ] || exit 1
if sh "$directory/database-restore.sh" "$archive" "$target"; then echo 'Nonempty target guard failed.' >&2; exit 1; fi
if sh "$directory/database-restore.sh" "$archive" "$PGDATABASE"; then echo 'Source target guard failed.' >&2; exit 1; fi
empty_target="${target}_bad"
createdb --no-password "$empty_target"
printf 'invalid archive' > "$archive.bad"
if sh "$directory/database-restore.sh" "$archive.bad" "$empty_target"; then echo 'Invalid archive accepted.' >&2; exit 1; fi
objects=$(psql --no-password --dbname="$empty_target" -XAt -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
[ "$objects" = 0 ] || exit 1
echo "Recovery drill passed: application rows/Unicode, migration history, overwrite/nonempty/source guards and invalid archive rollback. $source_migrations migrations restored."
