import hashlib
import time
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import LoginSession, User

hasher = PasswordHasher()
DUMMY_HASH = hasher.hash("nonexistent-account-timing-placeholder")
COOKIE_NAME = "training_session"


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_password(encoded: str, password: str) -> bool:
    try:
        return hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "请先登录")
    session = db.scalar(select(LoginSession).where(
        LoginSession.token_hash == token_hash(token),
        LoginSession.expires_at > int(time.time()),
    ))
    user = db.get(User, session.user_id) if session else None
    if user is None:
        raise HTTPException(401, "登录已失效，请重新登录")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "需要管理员权限")
    return user
