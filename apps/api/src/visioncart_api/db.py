"""Database engine, session factory and schema helpers."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from .config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _build_engine() -> Engine:
    url = get_settings().resolved_database_url
    connect_args: dict[str, object] = {}
    # Vercel / serverless: no persistent connections across invocations.
    # Neon pooler also prefers short-lived clients (NullPool).
    engine_kwargs: dict[str, object] = {"echo": False, "future": True}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    else:
        engine_kwargs["poolclass"] = NullPool
    return create_engine(url, connect_args=connect_args, **engine_kwargs)


engine: Engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def init_db() -> None:
    """Create all tables if they do not already exist."""
    # Import models so they are registered on ``Base.metadata`` before create_all.
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped database session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


if __name__ == "__main__":  # `python -m visioncart_api.db` -> create tables
    init_db()
    print(f"Initialized database at: {get_settings().resolved_database_url}")
