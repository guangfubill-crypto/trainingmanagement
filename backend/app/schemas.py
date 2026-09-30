from datetime import datetime
from typing import Annotated, Generic, Literal, TypeVar
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

Name = Annotated[str, Field(min_length=1, max_length=100)]
Code = Annotated[str, Field(min_length=1, max_length=32)]
Password = Annotated[str, Field(min_length=8, max_length=256)]
Role = Literal["admin", "user"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def trim(cls, value, info: ValidationInfo):
        if isinstance(value, str) and info.field_name != "password":
            return value.strip()
        return value

    @model_validator(mode="before")
    @classmethod
    def reject_null(cls, value):
        if isinstance(value, dict) and any(v is None for v in value.values()):
            raise ValueError("字段不能为 null")
        return value


class LoginInput(Input):
    username: Name
    password: Annotated[str, Field(min_length=1, max_length=256)]


class PasswordInput(Input):
    password: Password


class UserCreate(PasswordInput):
    username: Name
    role: Role = "user"


class UserUpdate(Input):
    username: Name | None = None
    role: Role | None = None


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class UserOutput(Output):
    username: str
    role: Role


class CourseCreate(Input):
    code: Code
    name: Name
    instructor: Name
    hours: Annotated[int, Field(strict=True, gt=0, le=2147483647)]
    description: Annotated[str, Field(max_length=2000)] = ""


class CourseUpdate(Input):
    code: Code | None = None
    name: Name | None = None
    instructor: Name | None = None
    hours: Annotated[int, Field(strict=True, gt=0, le=2147483647)] | None = None
    description: Annotated[str, Field(max_length=2000)] | None = None


class CourseOutput(Output):
    code: str
    name: str
    instructor: str
    hours: int
    description: str


class StudentCreate(Input):
    student_no: Code
    name: Name
    phone: Annotated[str, Field(max_length=32)] = ""
    notes: Annotated[str, Field(max_length=2000)] = ""


class StudentUpdate(Input):
    student_no: Code | None = None
    name: Name | None = None
    phone: Annotated[str, Field(max_length=32)] | None = None
    notes: Annotated[str, Field(max_length=2000)] | None = None


class StudentOutput(Output):
    student_no: str
    name: str
    phone: str
    notes: str


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
