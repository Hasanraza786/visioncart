from __future__ import annotations

from conftest import auth_headers
from fastapi.testclient import TestClient

SHIPPING = {
    "full_name": "Jane Buyer",
    "line1": "123 Market Street",
    "line2": "Apt 4",
    "city": "Metropolis",
    "state": "CA",
    "postal_code": "94000",
    "country": "USA",
    "phone": "+1-555-0100",
}


def _first_two_product_ids(client: TestClient) -> tuple[int, int]:
    products = client.get("/products").json()
    return products[0]["id"], products[1]["id"]


def test_cart_add_update_delete(client: TestClient, seeded: None) -> None:
    headers = auth_headers(client, "cartuser@example.com")
    p1, p2 = _first_two_product_ids(client)

    empty = client.get("/cart", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["items"] == []

    add = client.post("/cart/items", json={"product_id": p1, "quantity": 2}, headers=headers)
    assert add.status_code == 201, add.text
    cart = add.json()
    assert cart["items"][0]["quantity"] == 2
    assert cart["subtotal_cents"] == cart["items"][0]["product"]["price_cents"] * 2

    # Adding the same product again increments the quantity.
    again = client.post("/cart/items", json={"product_id": p1, "quantity": 1}, headers=headers)
    assert again.json()["items"][0]["quantity"] == 3

    client.post("/cart/items", json={"product_id": p2, "quantity": 1}, headers=headers)

    cart = client.get("/cart", headers=headers).json()
    assert len(cart["items"]) == 2
    item_id = cart["items"][0]["id"]

    patched = client.patch(
        f"/cart/items/{item_id}", json={"quantity": 5}, headers=headers
    )
    assert patched.status_code == 200
    updated_item = next(i for i in patched.json()["items"] if i["id"] == item_id)
    assert updated_item["quantity"] == 5

    deleted = client.delete(f"/cart/items/{item_id}", headers=headers)
    assert deleted.status_code == 200
    assert all(i["id"] != item_id for i in deleted.json()["items"])


def test_order_cod_happy_path_clears_cart(client: TestClient, seeded: None) -> None:
    headers = auth_headers(client, "buyer@example.com")
    p1, _ = _first_two_product_ids(client)

    client.post("/cart/items", json={"product_id": p1, "quantity": 2}, headers=headers)
    cart = client.get("/cart", headers=headers).json()
    expected_total = cart["subtotal_cents"]

    order_resp = client.post(
        "/orders", json={"shipping": SHIPPING, "notes": "Leave at door"}, headers=headers
    )
    assert order_resp.status_code == 201, order_resp.text
    order = order_resp.json()
    assert order["payment_method"] == "COD"
    assert order["shipping_cents"] == 0
    assert order["total_cents"] == expected_total
    assert order["status"] == "pending"
    assert order["ship_country"] == "USA"
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == 2

    # Cart is cleared after ordering.
    assert client.get("/cart", headers=headers).json()["items"] == []

    listing = client.get("/orders", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    detail = client.get(f"/orders/{order['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == order["id"]


def test_order_empty_cart_rejected(client: TestClient, seeded: None) -> None:
    headers = auth_headers(client, "emptycart@example.com")
    response = client.post("/orders", json={"shipping": SHIPPING}, headers=headers)
    assert response.status_code == 400


def test_order_requires_auth(client: TestClient, seeded: None) -> None:
    assert client.post("/orders", json={"shipping": SHIPPING}).status_code == 401


def test_cannot_read_other_users_order(client: TestClient, seeded: None) -> None:
    headers_a = auth_headers(client, "usera@example.com")
    p1, _ = _first_two_product_ids(client)
    client.post("/cart/items", json={"product_id": p1, "quantity": 1}, headers=headers_a)
    order = client.post("/orders", json={"shipping": SHIPPING}, headers=headers_a).json()

    headers_b = auth_headers(client, "userb@example.com")
    response = client.get(f"/orders/{order['id']}", headers=headers_b)
    assert response.status_code == 404
