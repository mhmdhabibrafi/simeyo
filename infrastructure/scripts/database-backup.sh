#!/bin/sh
set -eu
umask 077
: "${PGDATABASE:?Set PGDATABASE explicitly}"
destination=${1:?Usage: database-backup.sh /absolute/private/path/backup.dump}
case "$destination" in /*) ;; *) echo 'Backup path must be absolute.' >&2; exit 1;; esac
[ ! -e "$destination" ] || { echo 'Refusing to overwrite a backup.' >&2; exit 1; }
partial="$destination.partial"
# Noclobber claims only our temporary file; failed dumps never become a published archive.
(set -C; : > "$partial") || exit 1
trap 'rm -f -- "$partial"' EXIT HUP INT TERM
pg_dump --no-password --format=custom --no-owner --no-acl --file="$partial"
pg_restore --list "$partial" >/dev/null
ln "$partial" "$destination"
echo 'Database archive created. Store its checksum and encrypt off-host copies.'
