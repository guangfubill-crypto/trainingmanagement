from pathlib import Path

from fastapi import Request
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import BACKEND_DIR, settings


class Base(DeclarativeBase):
    pass


database_url = make_url(settings.database_url)
if database_url.get_backend_name() != "sqlite":
    raise ValueError("当前版本仅支持 SQLite 数据库")

if database_url.database and database_url.database != ":memory:":
    database_path = Path(database_url.database)
    if not database_path.is_absolute():
        database_path = BACKEND_DIR / database_path
    database_path.parent.mkdir(parents=True, exist_ok=True)
    database_url = database_url.set(database=str(database_path))

engine = create_engine(database_url, connect_args={"check_same_thread": False, "timeout": 15})


@event.listens_for(engine, "connect")
def enable_foreign_keys(connection, _record):
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db(request: Request):
    with SessionLocal() as session:
        # Serialize writes BEFORE authorization reads to prevent last-admin races.
        if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
            session.execute(text("BEGIN IMMEDIATE"))
        yield session
