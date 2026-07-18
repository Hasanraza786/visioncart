from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_categories(client: TestClient, seeded: None) -> None:
    response = client.get("/categories")
    assert response.status_code == 200
    slugs = {c["slug"] for c in response.json()}
    assert slugs == {"glasses", "ring", "watch", "earring", "nose_pin"}


def test_list_products(client: TestClient, seeded: None) -> None:
    response = client.get("/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 5
    assert all(p["currency"] == "USD" for p in products)
    assert all(p["price_cents"] > 0 for p in products)


def test_filter_products_by_category(client: TestClient, seeded: None) -> None:
    response = client.get("/products", params={"category_slug": "glasses"})
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 1
    assert products[0]["tryon_model_key"] == "glasses"


def test_search_products(client: TestClient, seeded: None) -> None:
    response = client.get("/products", params={"search": "aviator"})
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 1
    assert products[0]["name"] == "Aviator Classic"

    # `q` alias also works.
    response_q = client.get("/products", params={"q": "chrono"})
    assert response_q.status_code == 200
    assert response_q.json()[0]["name"] == "Chrono Steel"


def test_get_product_by_id_and_404(client: TestClient, seeded: None) -> None:
    listing = client.get("/products").json()
    product_id = listing[0]["id"]
    response = client.get(f"/products/{product_id}")
    assert response.status_code == 200
    assert response.json()["id"] == product_id

    assert client.get("/products/999999").status_code == 404
