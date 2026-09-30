import argparse
import getpass
import sqlite3
from pathlib import Path
from sqlalchemy import func, select, text
from pydantic import ValidationError
from app.database import Base, SessionLocal, database_url, engine
from app.models import User
from app.schemas import UserCreate
from app.security import hasher


def init_admin(username: str, password: str):
    payload = UserCreate(username=username, password=password, role="admin")
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.execute(text("BEGIN IMMEDIATE"))
        if db.scalar(select(func.count()).select_from(User)):
            raise ValueError("数据库已有用户，初始化已取消，不会覆盖现有账号")
        db.add(User(username=payload.username, password_hash=hasher.hash(payload.password), role="admin"))
        db.commit()


def backup_database(destination: Path):
    source = Path(database_url.database).resolve()
    destination = destination.resolve()
    if source == destination or destination.exists():
        raise ValueError("备份目标必须是尚不存在的新文件")
    if not source.is_file():
        raise ValueError("数据库尚不存在")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source) as src, sqlite3.connect(destination) as dst:
        src.backup(dst)


def main():
    parser = argparse.ArgumentParser(description="training 管理工具")
    sub = parser.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init-admin")
    init.add_argument("--username", required=True)
    backup = sub.add_parser("backup")
    backup.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "init-admin":
            password = getpass.getpass("管理员密码（至少 8 位）: ")
            if password != getpass.getpass("再次输入密码: "):
                raise ValueError("两次密码不一致")
            init_admin(args.username, password)
            print("管理员创建成功")
        else:
            backup_database(args.output)
            print("备份成功")
    except ValidationError:
        parser.exit(1, "用户名需 1–100 字符，密码需 8–256 字符\n")
    except ValueError as exc:
        parser.exit(1, str(exc) + "\n")


if __name__ == "__main__":
    main()
