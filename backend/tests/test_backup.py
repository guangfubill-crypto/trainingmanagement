import sqlite3
from app.cli import backup_database
import pytest


def test_backup_restore(admin, system, tmp_path):
    admin.post("/api/courses", json={"code": "B", "name": "Backup", "instructor": "Teacher", "hours": 2})
    backup = tmp_path / "backup.db"
    backup_database(backup)
    with pytest.raises(ValueError):
        backup_database(backup)
    restored = tmp_path / "restored.db"
    with sqlite3.connect(backup) as source, sqlite3.connect(restored) as target:
        source.backup(target)
    with sqlite3.connect(restored) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert db.execute("SELECT name FROM courses WHERE code='B'").fetchone()[0] == "Backup"
        assert db.execute("SELECT count(*) FROM users").fetchone()[0] == 2
