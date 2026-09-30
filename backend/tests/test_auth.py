import time
import pytest
from sqlalchemy import select
from app.cli import init_admin
from app.config import settings
from app.models import LoginSession, User
from app.security import COOKIE_NAME, token_hash, verify_password


def test_initialization_does_not_overwrite(system):
    _, factory, _ = system
    with pytest.raises(ValueError):
        init_admin("replacement", "Replacement-123")
    with factory() as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        assert user.password_hash.startswith("$argon2")
        assert verify_password(user.password_hash, "Admin-test-123")
        assert not db.scalar(select(User).where(User.username == "replacement"))


def test_login_logout_expiry_and_replay(system):
    client, factory, _ = system
    for username in ["admin", "missing"]:
        response = client.post("/api/auth/login", json={"username": username, "password": "wrong"})
        assert response.status_code == 401
        assert response.json()["detail"] == "用户名或密码错误"
    response = client.post("/api/auth/login", json={"username": "admin", "password": "Admin-test-123"})
    assert response.status_code == 200
    assert set(response.json()) == {"id", "username", "role", "created_at"}
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=lax" in response.headers["set-cookie"].lower()
    token = client.cookies.get(COOKIE_NAME)
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.set(COOKIE_NAME, token)
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.clear()
    client.post("/api/auth/login", json={"username": "admin", "password": "Admin-test-123"})
    token = client.cookies.get(COOKIE_NAME)
    with factory() as db:
        session = db.scalar(select(LoginSession).where(LoginSession.token_hash == token_hash(token)))
        assert session.token_hash != token
        session.expires_at = int(time.time()) - 1
        db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_source_validation_and_no_password_echo(system):
    client = system[0]
    body = {"username": "admin", "password": "Admin-test-123"}
    assert client.post("/api/auth/login", json=body, headers={"Origin": "https://evil.example"}).status_code == 403
    client.headers.pop("origin")
    assert client.post("/api/auth/login", json=body).status_code == 403
    client.headers["origin"] = "http://127.0.0.1:5173"
    response = client.post("/api/auth/login", json={"username": "", "password": "private-input"})
    assert response.status_code == 422
    assert "private-input" not in response.text


@pytest.mark.parametrize("path", ["/api/courses", "/api/students", "/api/users", "/api/auth/me"])
def test_anonymous_access(system, path):
    assert system[0].get(path).status_code == 401


def test_role_change_is_immediate(admin, system):
    with system[1]() as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        user.role = "user"
        db.commit()
    assert admin.get("/api/users").status_code == 403
    assert admin.post("/api/courses", json={"code": "X", "name": "X", "instructor": "X", "hours": 1}).status_code == 403
    assert admin.get("/api/courses").status_code == 200


def test_cookie_secure_setting(system, monkeypatch):
    monkeypatch.setattr(settings, "cookie_secure", True)
    response = system[0].post("/api/auth/login", json={"username": "admin", "password": "Admin-test-123"})
    assert "secure" in response.headers["set-cookie"].lower()
