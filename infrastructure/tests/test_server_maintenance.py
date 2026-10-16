import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("maintenance", Path(__file__).parents[1] / "scripts/server-maintenance.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class MaintenanceTests(unittest.TestCase):
    def test_backup_publishes_verified_files_and_hashes_without_overwriting(self):
        with tempfile.TemporaryDirectory() as directory:
            app = Path(directory); (app / ".env.production").write_text("APP_KEY=test-only")
            root = app / "backups"
            def command(args, output=None):
                if output: output.write(b"fixture-archive")
                return subprocess.CompletedProcess(args, 0, stdout=b"running")
            with patch.object(m, "run", side_effect=command), patch.object(m.subprocess, "run"), patch.object(m.shutil, "disk_usage", return_value=type("Disk", (), {"free": 10 * 1024**3})()):
                first = m.backup(root, "compose", app)
                second = m.backup(root, "compose", app)
            self.assertNotEqual(first, second)
            manifest = json.loads((first / "sha256.json").read_text())
            self.assertEqual(manifest["database.dump"], m.digest(first / "database.dump"))
            self.assertEqual((first / "application.env").read_text(), "APP_KEY=test-only")
            self.assertFalse(list(root.glob("*.partial")))

    def test_failed_backup_never_publishes_complete_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "backups"
            with patch.object(m, "run", side_effect=subprocess.CalledProcessError(1, "fixture")), patch.object(m.shutil, "disk_usage", return_value=type("Disk", (), {"free": 10 * 1024**3})()):
                with self.assertRaises(subprocess.CalledProcessError): m.backup(root, "compose", Path(directory))
            self.assertEqual(len(list(root.glob("*.partial"))), 1)
            self.assertFalse(list(root.glob("*/sha256.json")))

    def test_monitor_alerts_on_change_and_records_recovery_without_payloads(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); (root / "complete").mkdir(); (root / "complete/sha256.json").write_text("{}")
            state=root / "monitor.json"; alarms=[]; failed=True
            def command(args, output=None):
                if args[0] == "logger": alarms.append(args); return subprocess.CompletedProcess(args,0)
                if "operations-check" in " ".join(args): return subprocess.CompletedProcess(args,0,stdout=b'{"healthy":true}')
                return subprocess.CompletedProcess(args,0,stdout=b"" if failed and "worker" in args else b"running")
            with patch.object(m,"run",side_effect=command):
                self.assertFalse(m.check(root,"compose",state))
                self.assertFalse(m.check(root,"compose",state))
                self.assertEqual(len(alarms),1)
                failed=False
                self.assertTrue(m.check(root,"compose",state))
                self.assertEqual(len(alarms),2)
            self.assertTrue(json.loads(state.read_text())["healthy"])

if __name__ == "__main__": unittest.main()
