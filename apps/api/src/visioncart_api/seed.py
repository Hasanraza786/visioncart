"""Idempotent database seeding.

Run with: ``python -m visioncart_api.seed`` (or ``npm run seed``).
"""

from __future__ import annotations

import hashlib
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal, init_db
from .models import (
    AssetPlatform,
    AssetStatus,
    AssetVersion,
    AuthProvider,
    Category,
    Product,
    ProductVariant,
    User,
    UserRole,
)
from .security import hash_password

CATEGORIES: list[dict[str, str]] = [
    {
        "slug": "glasses",
        "name": "Glasses",
        "description": "Eyewear and sunglasses you can try on live.",
    },
    {
        "slug": "ring",
        "name": "Rings",
        "description": "Rings for every finger, virtually tried on.",
    },
    {
        "slug": "watch",
        "name": "Watches",
        "description": "Wristwatches previewed on your hand.",
    },
    {
        "slug": "earring",
        "name": "Earrings",
        "description": "Earrings previewed on your ears.",
    },
    {
        "slug": "nose_pin",
        "name": "Nose Pins",
        "description": "Nose pins previewed in real time.",
    },
]

PRODUCTS: list[dict[str, object]] = [
    {
        "slug": "glasses",
        "name": "Aviator Classic",
        "brand": "VisionCart",
        "color": "Gold",
        "description": "Timeless aviator frames with a lightweight metal build. Development try-on asset.",
        "price_cents": 12900,
        "tryon_model_key": "glasses",
        "preview_url": "https://cdn.visioncart.dev/previews/glasses/aviator-classic.png",
        "width_mm": 140.0,
        "height_mm": 45.0,
        "depth_mm": 145.0,
    },
    {
        "slug": "ring",
        "name": "Solitaire Band",
        "brand": "VisionCart",
        "color": "Silver",
        "description": "A minimalist solitaire band. Visual preview only — not sizing.",
        "price_cents": 24900,
        "tryon_model_key": "ring",
        "preview_url": "https://cdn.visioncart.dev/previews/ring/solitaire-band.png",
        "width_mm": 20.0,
        "height_mm": 20.0,
        "depth_mm": 8.0,
    },
    {
        "slug": "watch",
        "name": "Chrono Steel",
        "brand": "VisionCart",
        "color": "Black",
        "description": "A stainless-steel chronograph. Visual preview only — not sizing.",
        "price_cents": 39900,
        "tryon_model_key": "watch",
        "preview_url": "https://cdn.visioncart.dev/previews/watch/chrono-steel.png",
        "width_mm": 42.0,
        "height_mm": 42.0,
        "depth_mm": 12.0,
    },
    {
        "slug": "earring",
        "name": "Pearl Drop",
        "brand": "VisionCart",
        "color": "White",
        "description": "Elegant pearl drop earrings for a refined look.",
        "price_cents": 8900,
        "tryon_model_key": "earring",
        "preview_url": "https://cdn.visioncart.dev/previews/earring/pearl-drop.png",
        "width_mm": 12.0,
        "height_mm": 30.0,
        "depth_mm": 8.0,
    },
    {
        "slug": "nose_pin",
        "name": "Crystal Stud",
        "brand": "VisionCart",
        "color": "Rose Gold",
        "description": "A subtle crystal nose pin with a rose-gold finish.",
        "price_cents": 4900,
        "tryon_model_key": "nose_pin",
        "preview_url": "https://cdn.visioncart.dev/previews/nose-pin/crystal-stud.png",
        "width_mm": 6.0,
        "height_mm": 6.0,
        "depth_mm": 4.0,
    },
]


def _seed_admin(db: Session) -> None:
    settings = get_settings()
    email = settings.admin_email.lower()
    admin = db.scalar(select(User).where(User.email == email))
    if admin is None:
        admin = User(
            email=email,
            name=settings.admin_name,
            password_hash=hash_password(settings.admin_password),
            role=UserRole.admin,
            auth_provider=AuthProvider.email,
        )
        db.add(admin)
        print(f"Created admin user: {email}")
    else:
        if admin.role != UserRole.admin:
            admin.role = UserRole.admin
            print(f"Promoted existing user to admin: {email}")
        else:
            print(f"Admin user already present: {email}")
    db.commit()


def _seed_categories(db: Session) -> dict[str, Category]:
    result: dict[str, Category] = {}
    for data in CATEGORIES:
        category = db.scalar(select(Category).where(Category.slug == data["slug"]))
        if category is None:
            category = Category(**data)
            db.add(category)
            print(f"Created category: {data['slug']}")
        result[data["slug"]] = category
    db.commit()
    for slug in list(result):
        result[slug] = db.scalar(select(Category).where(Category.slug == slug))  # type: ignore[assignment]
    return result


def _seed_products(db: Session, categories: dict[str, Category]) -> None:
    for data in PRODUCTS:
        slug = str(data["slug"])
        name = str(data["name"])
        category = categories[slug]
        existing = db.scalar(
            select(Product).where(Product.category_id == category.id, Product.name == name)
        )
        if existing is None:
            product = Product(
                category_id=category.id,
                name=name,
                brand=str(data["brand"]),
                color=str(data["color"]),
                description=str(data["description"]),
                price_cents=int(data["price_cents"]),  # type: ignore[call-overload]
                currency="USD",
                tryon_model_key=str(data["tryon_model_key"]),
                preview_url=str(data["preview_url"]),
                width_mm=float(data["width_mm"]),  # type: ignore[arg-type]
                height_mm=float(data["height_mm"]),  # type: ignore[arg-type]
                depth_mm=float(data["depth_mm"]),  # type: ignore[arg-type]
                is_active=True,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            print(f"Created product: {name}")
        else:
            existing.width_mm = float(data["width_mm"])  # type: ignore[arg-type]
            existing.height_mm = float(data["height_mm"])  # type: ignore[arg-type]
            existing.depth_mm = float(data["depth_mm"])  # type: ignore[arg-type]
            db.commit()
            product = existing

        variant = db.scalar(
            select(ProductVariant).where(
                ProductVariant.product_id == product.id, ProductVariant.sku == f"{slug}-default"
            )
        )
        if variant is None:
            db.add(
                ProductVariant(
                    product_id=product.id,
                    sku=f"{slug}-default",
                    label="Default",
                    is_default=True,
                )
            )
            db.commit()

        asset = db.scalar(
            select(AssetVersion).where(
                AssetVersion.product_id == product.id,
                AssetVersion.platform == AssetPlatform.shared,
                AssetVersion.version == "dev-1.0.0",
            )
        )
        if asset is None:
            uri = f"bundled://{slug}.glb"
            checksum = hashlib.sha256(uri.encode()).hexdigest()
            db.add(
                AssetVersion(
                    product_id=product.id,
                    platform=AssetPlatform.shared,
                    version="dev-1.0.0",
                    status=AssetStatus.development,
                    uri=uri,
                    checksum_sha256=checksum,
                    content_type="model/gltf-binary",
                    byte_size=0,
                    root_node="root",
                    default_scale=1.0,
                    anchor_json=json.dumps(
                        {
                            "version": "1.0.0",
                            "rootNode": "root",
                            "category": slug,
                            "development": True,
                        }
                    ),
                )
            )
            db.commit()
            print(f"Created development asset for: {name}")


def run_seed() -> None:
    init_db()
    with SessionLocal() as db:
        _seed_admin(db)
        categories = _seed_categories(db)
        _seed_products(db, categories)
    print("Seed complete.")


if __name__ == "__main__":
    run_seed()
