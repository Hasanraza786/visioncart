"""Public catalog endpoints: categories & products."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from ..deps import SessionDep
from ..models import Category, Product
from ..schemas import CategoryOut, ProductOut

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: SessionDep) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


@router.get("/products", response_model=list[ProductOut])
def list_products(
    db: SessionDep,
    category_slug: str | None = Query(default=None),
    search: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> list[Product]:
    stmt = select(Product).where(Product.is_active.is_(True))

    if category_slug:
        stmt = stmt.join(Category).where(Category.slug == category_slug)

    term = (search or q or "").strip()
    if term:
        like = f"%{term}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(like),
                Product.brand.ilike(like),
                Product.color.ilike(like),
                Product.description.ilike(like),
            )
        )

    stmt = stmt.order_by(Product.name)
    return list(db.scalars(stmt).all())


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: SessionDep) -> Product:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product
