"""Authenticated cart endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep
from ..models import Cart, CartItem, Product, User
from ..schemas import CartItemCreate, CartItemOut, CartItemUpdate, CartOut, ProductOut

router = APIRouter(prefix="/cart", tags=["cart"])


def _get_or_create_cart(db: SessionDep, user: User) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.user_id == user.id))
    if cart is None:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _serialize_cart(cart: Cart) -> CartOut:
    items: list[CartItemOut] = []
    subtotal = 0
    currency = "USD"
    for item in cart.items:
        line_total = item.product.price_cents * item.quantity
        subtotal += line_total
        currency = item.product.currency
        items.append(
            CartItemOut(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                product=ProductOut.model_validate(item.product),
                line_total_cents=line_total,
            )
        )
    items.sort(key=lambda i: i.id)
    return CartOut(id=cart.id, items=items, subtotal_cents=subtotal, currency=currency)


@router.get("", response_model=CartOut)
def get_cart(current_user: CurrentUser, db: SessionDep) -> CartOut:
    cart = _get_or_create_cart(db, current_user)
    return _serialize_cart(cart)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_item(payload: CartItemCreate, current_user: CurrentUser, db: SessionDep) -> CartOut:
    product = db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    cart = _get_or_create_cart(db, current_user)
    existing = db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_id == payload.product_id
        )
    )
    if existing is None:
        db.add(CartItem(cart_id=cart.id, product_id=payload.product_id, quantity=payload.quantity))
    else:
        existing.quantity = min(existing.quantity + payload.quantity, 999)

    db.commit()
    db.refresh(cart)
    return _serialize_cart(cart)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(
    item_id: int, payload: CartItemUpdate, current_user: CurrentUser, db: SessionDep
) -> CartOut:
    item = db.get(CartItem, item_id)
    if item is None or item.cart.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    item.quantity = payload.quantity
    db.commit()
    cart = _get_or_create_cart(db, current_user)
    db.refresh(cart)
    return _serialize_cart(cart)


@router.delete("/items/{item_id}", response_model=CartOut)
def delete_item(item_id: int, current_user: CurrentUser, db: SessionDep) -> CartOut:
    item = db.get(CartItem, item_id)
    if item is None or item.cart.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    db.delete(item)
    db.commit()
    cart = _get_or_create_cart(db, current_user)
    db.refresh(cart)
    return _serialize_cart(cart)
