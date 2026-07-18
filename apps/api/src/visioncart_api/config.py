"""Application configuration loaded from the environment.

All settings use the ``VISIONCART_`` prefix and can be provided via a ``.env``
file (see ``.env.example``).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api  (config.py -> visioncart_api -> src -> api)
API_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = API_ROOT / "data"
DEFAULT_SQLITE_PATH = DATA_DIR / "visioncart.db"


class Settings(BaseSettings):
    """Typed application settings."""

    model_config = SettingsConfigDict(
        env_prefix="VISIONCART_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "local"

    # Database. Empty -> local SQLite file fallback.
    database_url: str | None = None

    # JWT / auth.
    jwt_secret: str = "dev-insecure-change-me-please-set-a-long-random-value"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "visioncart"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    # Admin seed account.
    admin_email: str = "visioncartadmin@yopmail.com"
    admin_password: str = "VisionCartAdmin!2026"
    admin_name: str = "VisionCart Admin"

    # CORS: comma separated origins, or "*".
    cors_origins: str = "*"

    # Social sign-in audiences (comma separated). Empty -> endpoint returns 503.
    google_client_ids: str = (
        "250279750810-ju1f2567c7hhk563vq30lkdorrqrddgs.apps.googleusercontent.com,"
        "250279750810-ie9o1qmbvfli9jcef9egsj8p0gtvr7pk.apps.googleusercontent.com,"
        "250279750810-fgcfaoebbmrprgt5pnoddv0jg59sqfa2.apps.googleusercontent.com"
    )
    apple_client_ids: str = "com.visioncart"

    @property
    def resolved_database_url(self) -> str:
        """Return the effective SQLAlchemy URL (SQLite fallback if unset).

        Managed Postgres providers (Neon, Vercel Postgres, Supabase, Railway)
        hand out URLs using the bare ``postgres://`` / ``postgresql://`` scheme,
        which SQLAlchemy resolves to the psycopg2 driver. We ship psycopg3, so
        normalise the scheme to ``postgresql+psycopg://`` here.
        """
        url = self.database_url
        if url:
            if url.startswith("postgres://"):
                url = "postgresql+psycopg://" + url[len("postgres://") :]
            elif url.startswith("postgresql://"):
                url = "postgresql+psycopg://" + url[len("postgresql://") :]
            return url
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return f"sqlite+pysqlite:///{DEFAULT_SQLITE_PATH}"

    @property
    def cors_origin_list(self) -> list[str]:
        value = self.cors_origins.strip()
        if not value or value == "*":
            return ["*"]
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @property
    def google_client_id_list(self) -> list[str]:
        return [c.strip() for c in self.google_client_ids.split(",") if c.strip()]

    @property
    def apple_client_id_list(self) -> list[str]:
        return [c.strip() for c in self.apple_client_ids.split(",") if c.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
