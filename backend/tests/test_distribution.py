from sqlalchemy import delete
from app.config import settings
from app.models import User, LoginSession


def test_web_setup_disabled_and_runtime(system):
    client = system[0]
    assert client.get("/api/runtime").json() == {"mode": "web", "setup_required": False}
    assert client.post("/api/setup", json={"username": "x", "password": "Long-password"}).status_code == 404


def test_desktop_setup_once_and_key(system, monkeypatch):
    client, factory, _ = system
    monkeypatch.setattr(settings, "desktop_mode", True)
    monkeypatch.setattr(settings, "desktop_key", "test-desktop-key")
    assert client.get("/api/runtime").status_code == 403
    client.headers["x-desktop-key"] = "test-desktop-key"
    with factory() as db:
        db.execute(delete(LoginSession))
        db.execute(delete(User))
        db.commit()
    assert client.get("/api/runtime").json()["setup_required"]
    assert client.post("/api/setup", json={"username": "owner", "password": "short"}).status_code == 422
    assert client.post("/api/setup", json={"username": "owner", "password": "Desktop-test-123"}).status_code == 201
    assert not client.get("/api/runtime").json()["setup_required"]
    assert client.post("/api/setup", json={"username": "other", "password": "Desktop-test-123"}).status_code == 409
    assert client.post("/api/auth/login", json={"username": "owner", "password": "Desktop-test-123"}).status_code == 200


def test_static_spa_and_boundaries(system, tmp_path, monkeypatch):
    web = tmp_path / "web"
    web.mkdir()
    (web / "index.html").write_text("<html>training</html>")
    (web / "assets").mkdir()
    (web / "assets" / "app.js").write_text("window.loaded=true")
    (tmp_path / "secret.txt").write_text("not public")
    monkeypatch.setattr(settings, "static_dir", str(web))
    client = system[0]
    assert client.get("/courses").text == "<html>training</html>"
    assert client.get("/assets/app.js").status_code == 200
    assert client.get("/assets/missing.js").status_code == 404
    assert client.get("/api/missing").status_code == 404
    assert client.get("/..%2Fsecret.txt").status_code == 404
