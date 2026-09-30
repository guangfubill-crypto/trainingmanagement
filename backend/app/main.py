from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.routers import auth, courses, students, users


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
