from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from app.main import app
from app.models import User
from tests.conftest import ORIGIN


def test_users_crud_reset_revocation(admin, system):
    response = admin.post("/api/users", json={"username": "new", "password": "New-test-123", "role": "user"})
    assert response.status_code == 201
    user_id = response.json()["id"]
    assert "password" not in response.text
    assert admin.get("/api/users", params={"q": "new"}).json()["total"] == 1
    assert admin.get(f"/api/users/{user_id}").json()["username"] == "new"
    assert admin.patch(f"/api/users/{user_id}", json={"username": "renamed", "role": "admin"}).status_code == 200
    with TestClient(app, headers=ORIGIN) as other:
        assert other.post("/api/auth/login", json={"username": "renamed", "password": "New-test-123"}).status_code == 200
        assert admin.post(f"/api/users/{user_id}/password", json={"password": "Reset-test-123"}).status_code == 204
        assert other.get("/api/auth/me").status_code == 401
        assert other.post("/api/auth/login", json={"username": "renamed", "password": "New-test-123"}).status_code == 401
        assert other.post("/api/auth/login", json={"username": "renamed", "password": "Reset-test-123"}).status_code == 200
        assert admin.delete(f"/api/users/{user_id}").status_code == 204
        assert other.get("/api/auth/me").status_code == 401
        assert other.post("/api/auth/login", json={"username": "renamed", "password": "Reset-test-123"}).status_code == 401
    assert admin.get(f"/api/users/{user_id}").status_code == 404


def test_validation_and_admin_protection(admin):
    own_id = admin.get("/api/auth/me").json()["id"]
    assert admin.delete(f"/api/users/{own_id}").status_code == 409
    assert admin.patch(f"/api/users/{own_id}", json={"role": "user"}).status_code == 409
    assert admin.post("/api/users", json={"username": "admin", "password": "Password-123"}).status_code == 409
    for body in [
        {"username": "x", "password": "short"},
        {"username": "x", "password": "Password-123", "role": "root"},
        {"username": "   ", "password": "Password-123"},
    ]:
        assert admin.post("/api/users", json=body).status_code == 422
    assert admin.get("/api/auth/me").json()["role"] == "admin"


def test_reader_user_endpoints(reader):
    assert reader.get("/api/users").status_code == 403
    assert reader.get("/api/users/1").status_code == 403
    assert reader.post("/api/users", json={"username": "x", "password": "Password-123"}).status_code == 403
    assert reader.patch("/api/users/1", json={"role": "user"}).status_code == 403
    assert reader.delete("/api/users/1").status_code == 403
    assert reader.post("/api/users/1/password", json={"password": "Password-123"}).status_code == 403


def test_concurrent_self_demotion_preserves_admin(admin, system):
    second_id = admin.post("/api/users", json={"username": "second", "password": "Second-test-123", "role": "admin"}).json()["id"]
    first_id = admin.get("/api/auth/me").json()["id"]
    with TestClient(app, headers=ORIGIN) as second:
        second.post("/api/auth/login", json={"username": "second", "password": "Second-test-123"})
        with ThreadPoolExecutor(max_workers=2) as pool:
            a = pool.submit(admin.patch, f"/api/users/{first_id}", json={"role": "user"})
            b = pool.submit(second.patch, f"/api/users/{second_id}", json={"role": "user"})
            assert sorted([a.result().status_code, b.result().status_code]) == [200, 409]
    with system[1]() as db:
        assert db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) == 1
