#!/usr/bin/env python3
"""Restricted same-host backups and redacted service alarms. Never deletes retained backups."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid


def run(command, output=None):
    return subprocess.run(command, stdout=output or subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=300)


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def backup(root, compose, app):
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    if root.is_symlink() or (os.name == "posix" and root.stat().st_mode & 0o077):
        raise RuntimeError("Backup directory must be private and not a symlink")
    if shutil.disk_usage(root).free < 2 * 1024**3:
        raise RuntimeError("Insufficient backup space")
    name = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    partial = root / (name + ".partial")
    partial.mkdir(mode=0o700)
    # Failed runs retain their private partial directory for operator inspection.
    with (partial / "database.dump").open("xb") as output:
        run([compose, "exec", "-T", "postgres", "sh", "-c", 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl'], output)
    with (partial / "database.dump").open("rb") as source:
        subprocess.run([compose, "exec", "-T", "postgres", "pg_restore", "--list"], stdin=source, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True, timeout=300)
    with (partial / "media.tar.gz").open("xb") as output:
        run([compose, "exec", "-T", "api", "tar", "-czf", "-", "-C", "/app/storage/app/private", "."], output)
    run(["tar", "-tzf", str(partial / "media.tar.gz")])
    shutil.copyfile(app / ".env.production", partial / "application.env")
    os.chmod(partial / "application.env", 0o600)
    manifest = {file.name: digest(file) for file in partial.iterdir()}
    (partial / "sha256.json").write_text(json.dumps(manifest), encoding="utf-8")
    complete = root / name
    partial.rename(complete)
    print(json.dumps({"backup": "verified", "directory": name, "off_host": False}))
    return complete


def check(root, compose, state):
    failures = []
    if shutil.disk_usage(root).free < 2 * 1024**3:
        failures.append("disk_space")
    complete = [p for p in root.iterdir() if p.is_dir() and not p.name.endswith(".partial") and (p / "sha256.json").is_file()]
    if not complete or max(p.stat().st_mtime for p in complete) < dt.datetime.now().timestamp() - 36 * 3600:
        failures.append("backup_stale")
    for service in ["api", "web", "worker", "reverb", "gateway", "postgres"]:
        try:
            result = run([compose, "ps", "--status", "running", "-q", service])
            if not result.stdout.strip(): failures.append("service_" + service)
        except (OSError, subprocess.SubprocessError): failures.append("service_" + service)
    try:
        result = run([compose, "exec", "-T", "api", "php", "artisan", "simeyo:operations-check", "--probe-queue"])
        if not json.loads(result.stdout).get("healthy"): failures.append("application_health")
    except (OSError, ValueError, subprocess.SubprocessError): failures.append("application_health")
    try:
        run([compose, "exec", "-T", "web", "node", "-e", "fetch('http://127.0.0.1:3000/login',{signal:AbortSignal.timeout(10000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"])
    except (OSError, subprocess.SubprocessError): failures.append("web_http")
    previous = json.loads(state.read_text()) if state.exists() else {}
    report = {"healthy": not failures, "failures": failures, "checked_at": dt.datetime.now(dt.timezone.utc).isoformat()}
    temporary = state.with_suffix(".partial")
    temporary.write_text(json.dumps(report), encoding="utf-8")
    os.chmod(temporary, 0o600)
    temporary.replace(state)
    if failures and failures != previous.get("failures"):
        run(["logger", "-p", "daemon.err", "-t", "simeyo-monitor", "Simeyo needs attention: " + ",".join(failures)])
    elif not failures and previous.get("failures"):
        run(["logger", "-p", "daemon.notice", "-t", "simeyo-monitor", "Simeyo recovered"])
    print(json.dumps(report))
    return not failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["backup", "check"])
    parser.add_argument("--root", type=Path, default=Path("/srv/simeyo/backups/scheduled"))
    parser.add_argument("--app", type=Path, default=Path("/srv/simeyo/app"))
    parser.add_argument("--compose", default="/srv/simeyo/compose")
    parser.add_argument("--state", type=Path, default=Path("/srv/simeyo/private/monitor-state.json"))
    args = parser.parse_args()
    os.umask(0o077)
    if args.action == "backup": backup(args.root, args.compose, args.app)
    else: return 0 if check(args.root, args.compose, args.state) else 1
    return 0


if __name__ == "__main__":
    try: raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError):
        # Command stderr may contain configuration; never print it into the journal.
        print('{"healthy":false,"error":"Maintenance failed; inspect restricted state and partial archives"}')
        raise SystemExit(1)
