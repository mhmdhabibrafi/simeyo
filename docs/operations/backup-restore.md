# Database backup and restore

These scripts target PostgreSQL 17 client tools (`pg_dump`, `pg_restore`, `psql`, `createdb`). The embedded Windows development package contains only server binaries, so the complete recovery drill runs against the isolated PostgreSQL 17 CI service. A passing drill is not evidence of production disaster recovery.

Use libpq environment settings (`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, `PGPASSFILE`) supplied by the operator or secret manager. Do not put passwords in command arguments or commit credential files. Use a client version compatible with the database server.

```sh
umask 077
export PGDATABASE=simeyo_production
sh infrastructure/scripts/database-backup.sh /private/backups/simeyo-20261015.dump
sha256sum /private/backups/simeyo-20261015.dump
```

The backup script writes a private temporary file, checks its archive inventory, then publishes without replacing an existing backup. Failed dumps do not become complete archives. Copy verified archives to encrypted storage outside the application host; define retention, alerts, recovery-point and recovery-time objectives before release. Never automate deletion until the operator has approved a retention policy.

Restore into a separately created, empty database whose name begins `simeyo_restore_`. Use an operator connection with permission to create objects there. The script refuses the source database, nonempty targets and unsafe names; it uses a single transaction and does not run DROP, `--clean` or `--create`.

```sh
createdb --template=template0 simeyo_restore_20261015
sh infrastructure/scripts/database-restore.sh /private/backups/simeyo-20261015.dump simeyo_restore_20261015
```

Only restore trusted archives: PostgreSQL restore can execute statements contained in a dump. Check the independently stored checksum, migration history, user/post/message counts and relationships, and start an isolated application against the restored target. Test login, permissions, media and messaging before an operator switches application connections. Keep the original database available for rollback. These scripts never switch an application or replace its existing database.

A database dump does not include uploaded media, object-store versions, application encryption keys, deployment configuration, roles or external service credentials. Back up private media and required keys separately with restricted access. Preserve `APP_KEY` to decrypt stored push-device tokens. Coordinate database snapshots and media retention/versioning; never delete blobs while a retained snapshot still references them. Production media recovery and key recovery remain untested.

The CI drill restores actual application tables plus a fictional user/profile with Unicode content, verifies migration history, and exercises overwrite/nonempty/source and invalid-archive guards. Its databases are disposable CI databases; it does not connect to the operator's local or production data.

The application recovery step additionally creates a fictional profile linked to a private PNG and an encrypted `PushDevice` token before dumping the database. It archives the fixture media in a restricted runner temporary directory, restores into a separate directory, and compares both archive and content SHA-256 hashes against the restored profile reference. Laravel must decrypt the restored database token with the retained CI `APP_KEY`; a different key must fail. No real push token or application key is written into the archive or logs. This checks application compatibility with retained keys, not recovery from a production secret manager, object-store version history, coordinated live snapshots or operator cutover. Those production drills remain outstanding.

References: [PostgreSQL pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [PostgreSQL pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).


## Scheduled server-only snapshots

The owner selected server-only storage on 2026-10-17. `server-maintenance.py backup` uses `/srv/simeyo/compose` from `/srv/simeyo/app`, creates `/srv/simeyo/backups/scheduled/<UTC timestamp>-<random>/` with mode 0700, validates database/media inventories, and writes SHA-256 hashes for the database, private media and retained `.env.production` key/config snapshot. File creation uses umask 077. Run only from the intended production checkout; never publish the backup directory through the web gateway. Failed `.partial` directories remain private for investigation. No backup or old media retention cleanup is automated.

The systemd templates in `infrastructure/production/systemd/` run as `mediasi`; adapt that user/path when installing elsewhere. The backup timer runs daily at 19:30 UTC (02:30 WIB), with up to five minutes jitter and Persistent catch-up. The monitor timer runs every five minutes. Installation/actual archive verification must be recorded in the current testing report before claiming those timers are active.

`sha256.json` plus archive inventories establish integrity/readability, not an application restore or atomic live database/media snapshot. Concurrent replacement/deletion of media can affect a sequential snapshot. Same-host archives do not protect against host loss/ransomware; independent encrypted copies remain a production gate. Keep application keys private and preserve the matching key when restoring.
