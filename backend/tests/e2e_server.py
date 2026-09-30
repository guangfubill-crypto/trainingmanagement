"""An isolated, disposable database and known fixtures for browser tests only."""
import os
import tempfile
from pathlib import Path

if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="training-e2e-") as directory:
        os.environ["DATABASE_URL"] = "sqlite:///" + (Path(directory) / "test.db").as_posix()
        os.environ["ALLOWED_ORIGINS"] = '["http://127.0.0.1:5174"]'
        os.environ["COOKIE_SECURE"] = "false"
        from app.cli import init_admin
        from app.database import SessionLocal, engine
        from app.models import User
        from app.security import hasher
        import uvicorn

        init_admin("admin", "Admin-test-123")
        with SessionLocal() as db:
            db.add(User(username="reader", role="user", password_hash=hasher.hash("Reader-test-123")))
            db.commit()
        try:
            uvicorn.run("app.main:app", host="127.0.0.1", port=8010)
        finally:
            engine.dispose()
