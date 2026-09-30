from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def get_record(db: Session, model, record_id: int):
    record = db.get(model, record_id)
    if record is None:
        raise HTTPException(404, "记录不存在")
    return record


def save(db: Session):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "编号或用户名已存在") from None


def list_records(db: Session, model, columns, q: str, page: int, page_size: int):
    condition = or_(*(column.contains(q.strip(), autoescape=True) for column in columns))
    query = select(model).where(condition)
    total = db.scalar(select(func.count()).select_from(model).where(condition))
    items = db.scalars(query.order_by(model.id).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}
