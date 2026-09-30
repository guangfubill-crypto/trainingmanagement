import pytest
from sqlalchemy import func, select
from fastapi.testclient import TestClient
from app.main import app
from app.models import User
from tests.conftest import ORIGIN

CASES = [
    ("/api/courses", {"code": "C-1", "name": "基础课程", "instructor": "王老师", "hours": 8}, "code"),
    ("/api/students", {"student_no": "S-1", "name": "张同学", "phone": "123"}, "student_no"),
]


@pytest.mark.parametrize("path,body,code", CASES)
def test_crud_search_validation_and_persistence(admin, system, path, body, code):
    response = admin.post(path, json=body)
    assert response.status_code == 201
    record_id = response.json()["id"]
    assert admin.post(path, json=body).status_code == 409
    assert admin.patch(f"{path}/{record_id}", json={"name": "   "}).status_code == 422
    assert admin.patch(f"{path}/{record_id}", json={"name": None}).status_code == 422
    assert admin.patch(f"{path}/{record_id}", json={"unexpected": "x"}).status_code == 422
    assert admin.patch(f"{path}/{record_id}", json={"name": "更新名称"}).json()["name"] == "更新名称"
    assert admin.get(path, params={"q": "更新", "page_size": 1}).json()["total"] == 1
    assert admin.get(path, params={"q": "missing"}).json()["items"] == []
    assert admin.get(path, params={"q": "%"}).json()["total"] == 0
    assert admin.get(path, params={"page": 2, "page_size": 1}).json()["items"] == []
    for params in [{"page": 0}, {"page_size": 0}, {"page_size": 101}]:
        assert admin.get(path, params=params).status_code == 422
    # A new application lifespan and new DB connections retain saved records.
    system[2].dispose()
    with TestClient(app, headers=ORIGIN) as restarted:
        restarted.post("/api/auth/login", json={"username": "reader", "password": "Reader-test-123"})
        assert restarted.get(f"{path}/{record_id}").json()["name"] == "更新名称"
    with system[1]() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 2
    assert admin.delete(f"{path}/{record_id}").status_code == 204
    for method in ["get", "delete", "patch"]:
        kwargs = {"json": {"name": "x"}} if method == "patch" else {}
        assert getattr(admin, method)(f"{path}/{record_id}", **kwargs).status_code == 404


@pytest.mark.parametrize("hours", [0, -1, 1.5, True, "2"])
def test_course_hours(admin, hours):
    assert admin.post("/api/courses", json={"code": "C", "name": "N", "instructor": "I", "hours": hours}).status_code == 422


@pytest.mark.parametrize("path,body,code", CASES)
def test_reader_cannot_write(reader, path, body, code):
    assert reader.get(path).status_code == 200
    assert reader.post(path, json=body).status_code == 403
    assert reader.patch(path + "/1", json={"name": "x"}).status_code == 403
    assert reader.delete(path + "/1").status_code == 403
    assert reader.get(path).json()["total"] == 0


def test_unique_update_conflict_is_atomic(admin):
    a = admin.post("/api/students", json={"student_no": "A", "name": "A"}).json()
    admin.post("/api/students", json={"student_no": "B", "name": "B"})
    assert admin.patch(f"/api/students/{a['id']}", json={"student_no": "B", "name": "changed"}).status_code == 409
    assert admin.get(f"/api/students/{a['id']}").json()["name"] == "A"
