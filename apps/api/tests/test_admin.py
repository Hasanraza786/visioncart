from __future__ import annotations

from conftest import auth_headers
from fastapi.testclient import TestClient

ADMIN_EMAIL = "visioncartadmin@yopmail.com"
ADMIN_PASSWORD = "VisionCartAdmin!2026"


def _admin_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['tokens']['access_token']}"}


def test_admin_can_crud_category_and_product(client: TestClient, seeded: None) -> None:
    headers = _admin_headers(client)

    cat = client.post(
        "/admin/categories",
        json={"slug": "bracelet", "name": "Bracelets", "description": "Wrist wear"},
        headers=headers,
    )
    assert cat.status_code == 201, cat.text
    category_id = cat.json()["id"]

    prod = client.post(
        "/admin/products",
        json={
            "category_id": category_id,
            "name": "Charm Bracelet",
            "brand": "VisionCart",
            "color": "Gold",
            "description": "A charming bracelet",
            "price_cents": 15900,
            "tryon_model_key": "ring",
            "preview_url": "https://cdn.visioncart.dev/previews/charm.png",
        },
        headers=headers,
    )
    assert prod.status_code == 201, prod.text
    product_id = prod.json()["id"]

    patched = client.patch(
        f"/admin/products/{product_id}", json={"price_cents": 17900}, headers=headers
    )
    assert patched.status_code == 200
    assert patched.json()["price_cents"] == 17900

    assert client.delete(f"/admin/products/{product_id}", headers=headers).status_code == 200
    assert client.delete(f"/admin/categories/{category_id}", headers=headers).status_code == 200


def test_admin_can_update_order_status(client: TestClient, seeded: None) -> None:
    buyer = auth_headers(client, "orderbuyer@example.com")
    product_id = client.get("/products").json()[0]["id"]
    client.post("/cart/items", json={"product_id": product_id, "quantity": 1}, headers=buyer)
    order = client.post(
        "/orders",
        json={
            "shipping": {
                "full_name": "Buyer",
                "line1": "1 Road",
                "city": "Town",
                "postal_code": "00000",
                "country": "USA",
                "phone": "123",
            }
        },
        headers=buyer,
    ).json()

    admin = _admin_headers(client)
    all_orders = client.get("/admin/orders", headers=admin)
    assert all_orders.status_code == 200
    assert len(all_orders.json()) == 1

    updated = client.patch(
        f"/admin/orders/{order['id']}", json={"status": "confirmed"}, headers=admin
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "confirmed"


def test_non_admin_forbidden(client: TestClient, seeded: None) -> None:
    headers = auth_headers(client, "regular@example.com")
    response = client.post(
        "/admin/categories",
        json={"slug": "x", "name": "X", "description": ""},
        headers=headers,
    )
    assert response.status_code == 403
