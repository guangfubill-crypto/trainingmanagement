import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app import cli, database, main
from app.models import User
from app.security import hasher

ORIGIN = {"Origin": "http://127.0.0.1:5173"}


@pytest.fixture()
def system(tmp_path, monkeypatch):
    engine = create_engine("sqlite:///" + str(tmp_path / "test.db"), connect_args={"check_same_thread": False, "timeout": 15})
    event.listen(engine, "connect", database.enable_foreign_keys)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(database, "SessionLocal", factory)
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(cli, "engine", engine)
    monkeypatch.setattr(cli, "SessionLocal", factory)
    monkeypatch.setattr(cli, "database_url", engine.url)
    cli.init_admin("admin", "Admin-test-123")
    with factory() as db:
        db.add(User(username="reader", password_hash=hasher.hash("Reader-test-123"), role="user"))
        db.commit()
    with TestClient(main.app, headers=ORIGIN) as client:
        yield client, factory, engine
    engine.dispose()


@pytest.fixture()
def admin(system):
    client = system[0]
    assert client.post("/api/auth/login", json={"username": "admin", "password": "Admin-test-123"}).status_code == 200
    return client


@pytest.fixture()
def reader(system):
    client = system[0]
    assert client.post("/api/auth/login", json={"username": "reader", "password": "Reader-test-123"}).status_code == 200
    return client
