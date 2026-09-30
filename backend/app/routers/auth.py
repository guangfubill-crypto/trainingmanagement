import secrets
import time
from fastapi import APIRouter, Depends, Request, Response
from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import LoginSession, User
from app.schemas import LoginInput, UserOutput
from app.security import COOKIE_NAME, DUMMY_HASH, current_user, token_hash, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserOutput)
def login(body: LoginInput, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    valid = verify_password(user.password_hash if user else DUMMY_HASH, body.password)
    if not user or not valid:
        raise HTTPException(401, "用户名或密码错误")
    old_token = request.cookies.get(COOKIE_NAME)
    if old_token:
        db.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(old_token)))
    db.execute(delete(LoginSession).where(LoginSession.expires_at <= int(time.time())))
    token = secrets.token_urlsafe(32)
    db.add(LoginSession(token_hash=token_hash(token), user_id=user.id,
                        expires_at=int(time.time()) + settings.session_seconds))
    db.commit()
    response.set_cookie(COOKIE_NAME, token, max_age=settings.session_seconds,
                        httponly=True, secure=settings.cookie_secure, samesite="lax", path="/")
    return user


@router.get("/me", response_model=UserOutput)
def me(user: User = Depends(current_user)):
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        db.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(token)))
        db.commit()
    response = Response(status_code=204)
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True,
                           secure=settings.cookie_secure, samesite="lax")
    return response
