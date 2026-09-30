from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Student
from app.schemas import StudentCreate, StudentUpdate, StudentOutput, Page
from app.security import admin_user, current_user
from app.routers.common import get_record, list_records, save

router = APIRouter(prefix="/api/students", tags=["students"], dependencies=[Depends(current_user)])


@router.get("", response_model=Page[StudentOutput])
def index(q: str = Query("", max_length=100), page: int = Query(1, ge=1),
          page_size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    return list_records(db, Student, [Student.student_no, Student.name], q, page, page_size)


@router.get("/{record_id}", response_model=StudentOutput)
def detail(record_id: int, db: Session = Depends(get_db)):
    return get_record(db, Student, record_id)


@router.post("", response_model=StudentOutput, status_code=201, dependencies=[Depends(admin_user)])
def create(body: StudentCreate, db: Session = Depends(get_db)):
    record = Student(**body.model_dump())
    db.add(record)
    save(db)
    return record


@router.patch("/{record_id}", response_model=StudentOutput, dependencies=[Depends(admin_user)])
def update(record_id: int, body: StudentUpdate, db: Session = Depends(get_db)):
    record = get_record(db, Student, record_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    save(db)
    return record


@router.delete("/{record_id}", status_code=204, dependencies=[Depends(admin_user)])
def remove(record_id: int, db: Session = Depends(get_db)):
    record = get_record(db, Student, record_id)
    db.delete(record)
    save(db)
    return Response(status_code=204)
