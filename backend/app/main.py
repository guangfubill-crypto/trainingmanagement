from contextlib import asynccontextmanager
import secrets
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy import text, select, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.routers import auth, courses, students, users
from app.models import User
from app.schemas import Name, PasswordInput, UserOutput
from app.security import hasher


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    yield
    engine.dispose()


app = FastAPI(title="training 培训管理系统", version="0.1.0", lifespan=lifespan)
for router in (auth.router, courses.router, students.router, users.router):
    app.include_router(router)


@app.middleware("http")
async def request_security(request: Request, call_next):
    if settings.desktop_mode:
        key = request.headers.get("x-desktop-key", "")
        if not settings.desktop_key or not secrets.compare_digest(key, settings.desktop_key):
            return JSONResponse(status_code=403, content={"detail": "请通过桌面程序访问"})
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        if request.headers.get("origin") not in settings.allowed_origins:
            return JSONResponse(status_code=403, content={"detail": "请求来源不被允许"})
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    # Never echo input data, particularly passwords, in validation responses.
    errors = [{"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
              for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    database: Literal["ok"] = "ok"
    service: str


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="数据库暂不可用") from None
    return HealthResponse(service=settings.app_name)


@app.get("/api/runtime")
def runtime(db: Session = Depends(get_db)):
    return {"mode": "desktop" if settings.desktop_mode else "web",
            "setup_required": settings.desktop_mode and db.scalar(select(func.count()).select_from(User)) == 0}


class SetupInput(PasswordInput):
    username: Name


@app.post("/api/setup", response_model=UserOutput, status_code=201)
def setup(body: SetupInput, db: Session = Depends(get_db)):
    if not settings.desktop_mode:
        raise HTTPException(404, "接口不存在")
    if db.scalar(select(func.count()).select_from(User)):
        raise HTTPException(409, "管理员已配置，请登录")
    user = User(username=body.username, password_hash=hasher.hash(body.password), role="admin")
    db.add(user)
    db.commit()
    return user


@app.get("/{asset_path:path}", include_in_schema=False)
def frontend(asset_path: str):
    if asset_path == "api" or asset_path.startswith("api/") or not settings.static_dir:
        raise HTTPException(404, "接口或资源不存在")
    root = Path(settings.static_dir).resolve()
    target = (root / asset_path).resolve()
    if not target.is_relative_to(root):
        raise HTTPException(404, "资源不存在")
    if target.is_file():
        return FileResponse(target)
    if asset_path.startswith("assets/") or "." in Path(asset_path).name:
        raise HTTPException(404, "资源不存在")
    index = root / "index.html"
    if not index.is_file():
        raise HTTPException(503, "前端资源未安装")
    return FileResponse(index)
