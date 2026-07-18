"""Idempotent database seeding.

Run with: ``python -m visioncart_api.seed`` (or ``npm run seed``).

Seeds:
  * Admin user (from VISIONCART_ADMIN_EMAIL / VISIONCART_ADMIN_PASSWORD)
  * 5 try-on categories (glasses, ring, watch, earring, nose_pin)
  * 5 products (one per category) priced in USD cents
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal, init_db
from .models import AuthProvider, Category, Product, User, UserRole
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

# tryon_model_key values match the try-on category keys / bundled GLB assets.
PRODUCTS: list[dict[str, object]] = [
    {
        "slug": "glasses",
        "name": "Aviator Classic",
        "brand": "VisionCart",
        "color": "Gold",
        "description": "Timeless aviator frames with a lightweight metal build.",
        "price_cents": 12900,
        "tryon_model_key": "glasses",
        "preview_url": "https://cdn.visioncart.dev/previews/glasses/aviator-classic.png",
    },
    {
        "slug": "ring",
        "name": "Solitaire Band",
        "brand": "VisionCart",
        "color": "Silver",
        "description": "A minimalist solitaire band that suits any occasion.",
        "price_cents": 24900,
        "tryon_model_key": "ring",
        "preview_url": "https://cdn.visioncart.dev/previews/ring/solitaire-band.png",
    },
    {
        "slug": "watch",
        "name": "Chrono Steel",
        "brand": "VisionCart",
        "color": "Black",
        "description": "A stainless-steel chronograph with a modern dial.",
        "price_cents": 39900,
        "tryon_model_key": "watch",
        "preview_url": "https://cdn.visioncart.dev/previews/watch/chrono-steel.png",
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
        # Keep role authoritative without clobbering an existing password.
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
            select(Product).where(
                Product.category_id == category.id, Product.name == name
            )
        )
        if existing is not None:
            continue
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
            is_active=True,
        )
        db.add(product)
        print(f"Created product: {name}")
    db.commit()


def run_seed() -> None:
    init_db()
    with SessionLocal() as db:
        _seed_admin(db)
        categories = _seed_categories(db)
        _seed_products(db, categories)
    print("Seed complete.")


if __name__ == "__main__":
    run_seed()
