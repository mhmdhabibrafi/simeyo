# Operational checks

The public `/api/v1/health` endpoint checks database connectivity and returns no credentials or queue payloads. It does not establish worker, push-provider or private WebSocket health. An operator should monitor the canonical HTTPS URL externally and alert on failed requests, certificate expiry and sustained error/latency changes. No external alert destination is configured by this repository.

From trusted server access, run the read-only check:

```sh
php artisan simeyo:operations-check
```

The JSON contains database status, ready-job count, oldest ready-job age and failed-job count. Future scheduled deliveries are excluded from ready-job age. A backlog older than five minutes, any failed job, unavailable dependency or unsupported queue configuration returns exit code 1. Job bodies, user IDs, access tokens and exception contents are never printed. `--max-age=60..3600` changes the ready-job age budget. Failed jobs require investigation; the check never retries, deletes or prunes them.

For an active worker round trip:

```sh
php artisan simeyo:operations-check --probe-queue --wait=10
```

This explicitly enqueues one synthetic heartbeat. It requires the release database queue and a shared cache, waits at most 1–30 seconds and returns nonzero if no worker confirms it. Only its own random cache key is removed; a late heartbeat expires after 60 seconds. This demonstrates queue processing by an available worker, not the health of every worker process. The default check does not enqueue work.

The release CI checks an actual heartbeat, stops its disposable worker and requires the probe to fail, then restarts the worker and requires recovery. Local validation passed with the existing worker. Four automated API tests cover overdue versus future jobs, redaction, unsupported probe settings and cache expiry. Runtime CI acceptance must be recorded in PROGRESS.md before claiming it passed.

Keep application/database/queue logs restricted: they can contain private request details. Route operational exit codes and generic health metrics to the operator's approved monitoring system, with documented ownership and escalation. Configure disk/media capacity, database connections, queue age, failed jobs and provider delivery-error alerts before public rollout. Do not automatically reset a database, replace application keys or delete media in response to a health alarm.


## Local scheduled alarms

The 2026-10-17 maintenance helper and systemd templates add a five-minute check for running API/web/worker/Reverb/gateway/PostgreSQL containers, a successful internal web login response, a queue round trip, disk space (2 GiB reserve) and the last complete scheduled backup (36-hour freshness). The API counts only server-error statuses in short-lived cache buckets; five or more responses across the current and previous four minutes make operations-check fail. No URLs, user IDs, request bodies or exception texts enter these counters. Restricted application stderr remains the diagnostic source.

The owner selected server-only operation. Read `/srv/simeyo/private/monitor-state.json`, `systemctl status simeyo-monitor.service`, and `journalctl -t simeyo-monitor -t simeyo-maintenance` locally. Changed failures and recovery produce redacted journal alarms; systemd OnFailure also logs failed maintenance units. The script never retries jobs, changes data or deletes old backups. No external delivery/recipient is configured, and a failed host cannot notify from its own journal. External uptime and alert delivery remain separate release gates.
