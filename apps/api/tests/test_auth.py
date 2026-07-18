from __future__ import annotations

from fastapi.testclient import TestClient


def test_register_returns_user_and_tokens(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "Password123!", "name": "Alice"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["role"] == "customer"
    assert body["tokens"]["access_token"]
    assert body["tokens"]["refresh_token"]
    assert body["tokens"]["token_type"] == "bearer"


def test_register_duplicate_email_conflicts(client: TestClient) -> None:
    payload = {"email": "dupe@example.com", "password": "Password123!", "name": "Dupe"}
    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_login_and_me(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"email": "bob@example.com", "password": "Password123!", "name": "Bob"},
    )
    login = client.post(
        "/auth/login", json={"email": "bob@example.com", "password": "Password123!"}
    )
    assert login.status_code == 200, login.text
    access = login.json()["tokens"]["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["email"] == "bob@example.com"


def test_login_wrong_password(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={"email": "carol@example.com", "password": "Password123!", "name": "Carol"},
    )
    login = client.post(
        "/auth/login", json={"email": "carol@example.com", "password": "wrong-password"}
    )
    assert login.status_code == 401


def test_refresh_issues_new_access_token(client: TestClient) -> None:
    reg = client.post(
        "/auth/register",
        json={"email": "dave@example.com", "password": "Password123!", "name": "Dave"},
    ).json()
    refresh_token = reg["tokens"]["refresh_token"]

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200, response.text
    assert response.json()["access_token"]


def test_me_requires_auth(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401


def test_google_endpoint_503_when_unconfigured(client: TestClient) -> None:
    response = client.post("/auth/google", json={"id_token": "dummy"})
    assert response.status_code == 503


def test_apple_endpoint_503_when_unconfigured(client: TestClient) -> None:
    response = client.post("/auth/apple", json={"identity_token": "dummy"})
    assert response.status_code == 503
