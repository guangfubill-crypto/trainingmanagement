from pathlib import Path
from pydantic import Field

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )
    app_name: str = "training"
    allowed_origins: list[str] = ["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:8000", "http://localhost:8000"]
    cookie_secure: bool = False
    session_seconds: int = Field(default=8 * 60 * 60, gt=0)
    database_url: str = "sqlite:///" + (BACKEND_DIR / "data" / "training.db").as_posix()


settings = Settings()
