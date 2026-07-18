"""Admin endpoints (role=admin): manage catalog & orders."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..deps import CurrentAdmin, SessionDep
from ..models import Category, Order, Product
from ..schemas import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    MessageResponse,
    OrderOut,
    OrderStatusUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[])


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate, _admin: CurrentAdmin, db: SessionDep
) -> Category:
    category = Category(slug=payload.slug, name=payload.name, description=payload.description)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists"
        ) from exc
    db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, payload: CategoryUpdate, _admin: CurrentAdmin, db: SessionDep
) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists"
        ) from exc
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", response_model=MessageResponse)
def delete_category(
    category_id: int, _admin: CurrentAdmin, db: SessionDep
) -> MessageResponse:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    has_products = db.scalar(select(Product.id).where(Product.category_id == category_id))
    if has_products is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a category that still has products",
        )
    db.delete(category)
    db.commit()
    return MessageResponse(message="Category deleted")


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, _admin: CurrentAdmin, db: SessionDep) -> Product:
    if db.get(Category, payload.category_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int, payload: ProductUpdate, _admin: CurrentAdmin, db: SessionDep
) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and db.get(Category, data["category_id"]) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category_id")
    for field, value in data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", response_model=MessageResponse)
def delete_product(product_id: int, _admin: CurrentAdmin, db: SessionDep) -> MessageResponse:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()
    return MessageResponse(message="Product deleted")


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(_admin: CurrentAdmin, db: SessionDep) -> list[Order]:
    stmt = select(Order).order_by(Order.created_at.desc(), Order.id.desc())
    return list(db.scalars(stmt).all())


@router.patch("/orders/{order_id}", response_model=OrderOut)
def update_order_status(
    order_id: int, payload: OrderStatusUpdate, _admin: CurrentAdmin, db: SessionDep
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
