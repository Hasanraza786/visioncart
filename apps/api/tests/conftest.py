"""Pytest fixtures: isolated SQLite database + TestClient.

The database URL and social-auth config are set BEFORE any application module is
imported so that ``get_settings()`` (lru-cached) picks up the test values.
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

_TMP_DIR = Path(tempfile.mkdtemp(prefix="visioncart-test-"))
_DB_PATH = _TMP_DIR / "test.db"

os.environ["VISIONCART_DATABASE_URL"] = f"sqlite+pysqlite:///{_DB_PATH}"
os.environ["VISIONCART_JWT_SECRET"] = "test-secret-key-for-visioncart-tests-0123456789"
os.environ["VISIONCART_ADMIN_EMAIL"] = "visioncartadmin@yopmail.com"
os.environ["VISIONCART_ADMIN_PASSWORD"] = "VisionCartAdmin!2026"
# Empty -> social endpoints deterministically return 503 in tests.
os.environ["VISIONCART_GOOGLE_CLIENT_IDS"] = ""
os.environ["VISIONCART_APPLE_CLIENT_IDS"] = ""


@pytest.fixture(autouse=True)
def _reset_db() -> Iterator[None]:
    from visioncart_api import models  # noqa: F401  (register tables)
    from visioncart_api.db import Base, engine

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> Iterator[TestClient]:
    from fastapi.testclient import TestClient

    from visioncart_api.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seeded() -> None:
    from visioncart_api.seed import run_seed

    run_seed()


def register(
    client: TestClient,
    email: str,
    password: str = "Password123!",
    name: str = "Test User",
) -> dict:
    response = client.post(
        "/auth/register", json={"email": email, "password": password, "name": name}
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth_headers(
    client: TestClient, email: str, password: str = "Password123!"
) -> dict[str, str]:
    data = register(client, email, password)
    return {"Authorization": f"Bearer {data['tokens']['access_token']}"}


# Imported lazily for type hints only.
from fastapi.testclient import TestClient  # noqa: E402
