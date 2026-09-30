from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import LoginSession, User
from app.schemas import Page, PasswordInput, UserCreate, UserOutput, UserUpdate
from app.security import admin_user, hasher
from app.routers.common import get_record, list_records, save

router = APIRouter(prefix="/api/users", tags=["users"], dependencies=[Depends(admin_user)])


def protect_last_admin(db: Session, user: User):
    if user.role == "admin" and db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) <= 1:
        raise HTTPException(409, "不能删除或降级最后一个管理员")


@router.get("", response_model=Page[UserOutput])
def index(q: str = Query("", max_length=100), page: int = Query(1, ge=1),
          page_size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    return list_records(db, User, [User.username], q, page, page_size)


@router.get("/{record_id}", response_model=UserOutput)
def detail(record_id: int, db: Session = Depends(get_db)):
    return get_record(db, User, record_id)


@router.post("", response_model=UserOutput, status_code=201)
def create(body: UserCreate, db: Session = Depends(get_db)):
    user = User(username=body.username, role=body.role, password_hash=hasher.hash(body.password))
    db.add(user)
    save(db)
    return user


@router.patch("/{record_id}", response_model=UserOutput)
def update(record_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    user = get_record(db, User, record_id)
    if body.role == "user":
        protect_last_admin(db, user)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    save(db)
    return user


@router.delete("/{record_id}", status_code=204)
def remove(record_id: int, actor: User = Depends(admin_user), db: Session = Depends(get_db)):
    user = get_record(db, User, record_id)
    if actor.id == user.id:
        raise HTTPException(409, "不能删除当前登录账号")
    protect_last_admin(db, user)
    db.delete(user)
    save(db)
    return Response(status_code=204)


@router.post("/{record_id}/password", status_code=204)
def reset_password(record_id: int, body: PasswordInput, db: Session = Depends(get_db)):
    user = get_record(db, User, record_id)
    user.password_hash = hasher.hash(body.password)
    db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
    save(db)
    return Response(status_code=204)
