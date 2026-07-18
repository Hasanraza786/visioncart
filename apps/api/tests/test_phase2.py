"""Phase 2 API coverage: favorites, guests, assets, try-on, filters."""

from __future__ import annotations

from conftest import auth_headers, register


def test_brand_color_filters(client, seeded):
    gold = client.get("/products", params={"color": "Gold"})
    assert gold.status_code == 200
    assert all(p["color"].lower() == "gold" for p in gold.json())

    brand = client.get("/products", params={"brand": "VisionCart"})
    assert brand.status_code == 200
    assert len(brand.json()) >= 5


def test_asset_resolve_development(client, seeded):
    products = client.get("/products").json()
    product_id = products[0]["id"]
    res = client.get(f"/assets/resolve/{product_id}")
    assert res.status_code == 200
    body = res.json()
    assert body["development"] is True
    assert body["status"] == "development"
    assert body["width_mm"] > 0


def test_guest_create_and_tryon_recent(client, seeded):
    guest = client.post("/guests")
    assert guest.status_code == 201
    guest_key = guest.json()["guest_key"]

    products = client.get("/products").json()
    product_id = products[0]["id"]
    session = client.post(
        "/tryon/sessions",
        json={
            "session_key": "sess-guest-1",
            "product_id": product_id,
            "category": products[0]["tryon_model_key"],
            "outcome": "completed",
            "duration_ms": 1200,
            "engine": "test",
            "device_tier": "standard",
            "guest_key": guest_key,
        },
    )
    assert session.status_code == 201

    recent = client.get("/tryon/recent", params={"guest_key": guest_key})
    assert recent.status_code == 200
    assert len(recent.json()) >= 1


def test_favorites_and_merge(client, seeded):
    headers = auth_headers(client, "fav-user@example.com")
    products = client.get("/products").json()
    product_id = products[0]["id"]

    add = client.post(f"/favorites/{product_id}", headers=headers)
    assert add.status_code == 201
    listed = client.get("/favorites", headers=headers)
    assert listed.status_code == 200
    assert any(f["product"]["id"] == product_id for f in listed.json())

    guest = client.post("/guests").json()["guest_key"]
    merge = client.post(
        "/guests/merge",
        headers=headers,
        json={"guest_key": guest, "idempotency_key": "merge-key-1"},
    )
    assert merge.status_code == 200
    again = client.post(
        "/guests/merge",
        headers=headers,
        json={"guest_key": guest, "idempotency_key": "merge-key-1"},
    )
    assert again.status_code == 200
    assert again.json()["message"] == "Already merged"


def test_account_delete(client, seeded):
    data = register(client, "delete-me@example.com")
    headers = {"Authorization": f"Bearer {data['tokens']['access_token']}"}
    deleted = client.delete("/account", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True
    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 401


def test_request_id_header(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert "x-request-id" in {k.lower() for k in res.headers.keys()}
