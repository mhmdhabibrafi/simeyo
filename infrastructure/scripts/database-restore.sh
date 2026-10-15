#!/bin/sh
set -eu
: "${PGDATABASE:?Set PGDATABASE to the source database name for the safety check}"
archive=${1:?Usage: database-restore.sh /private/backup.dump simeyo_restore_unique}
target=${2:?Supply a separate, pre-created empty restore database}
case "$target" in simeyo_restore_*) ;; *) echo 'Target must begin simeyo_restore_.' >&2; exit 1;; esac
case "$target" in *[!a-z0-9_]*) echo 'Invalid restore database name.' >&2; exit 1;; esac
[ ${#target} -le 63 ] && [ "$target" != "$PGDATABASE" ] || { echo 'Refusing unsafe restore target.' >&2; exit 1; }
[ -f "$archive" ] || { echo 'Archive not found.' >&2; exit 1; }
objects=$(psql --no-password --dbname="$target" -XAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_namespace WHERE nspname NOT IN ('public','information_schema') AND nspname !~ '^pg_' UNION ALL SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_' UNION ALL SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_' UNION ALL SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_'")
[ -n "$objects" ] || { echo 'Unable to inspect target.' >&2; exit 1; }
for count in $objects; do
  [ "$count" = 0 ] || { echo 'Refusing to restore into a nonempty database.' >&2; exit 1; }
done
pg_restore --no-password --dbname="$target" --single-transaction --exit-on-error --no-owner --no-acl "$archive"
echo 'Archive restored into the separate empty target. Verify data and media before switching applications.'
