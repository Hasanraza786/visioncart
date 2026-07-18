"""Authenticated order endpoints (COD, free shipping)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep
from ..models import Cart, Order, OrderItem, OrderStatus
from ..schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, current_user: CurrentUser, db: SessionDep) -> Order:
    cart = db.scalar(select(Cart).where(Cart.user_id == current_user.id))
    if cart is None or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty"
        )

    subtotal = 0
    currency = "USD"
    order_items: list[OrderItem] = []
    for item in cart.items:
        product = item.product
        line_total = product.price_cents * item.quantity
        subtotal += line_total
        currency = product.currency
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                unit_price_cents=product.price_cents,
                quantity=item.quantity,
            )
        )

    ship = payload.shipping
    order = Order(
        user_id=current_user.id,
        status=OrderStatus.pending,
        subtotal_cents=subtotal,
        shipping_cents=0,  # free delivery
        total_cents=subtotal,
        currency=currency,
        payment_method="COD",
        notes=payload.notes or "",
        ship_full_name=ship.full_name,
        ship_line1=ship.line1,
        ship_line2=ship.line2 or "",
        ship_city=ship.city,
        ship_state=ship.state or "",
        ship_postal_code=ship.postal_code,
        ship_country=ship.country,
        ship_phone=ship.phone,
        items=order_items,
    )
    db.add(order)

    # Clear the cart after placing the order.
    for item in list(cart.items):
        db.delete(item)

    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[OrderOut])
def list_orders(current_user: CurrentUser, db: SessionDep) -> list[Order]:
    stmt = (
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc(), Order.id.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, current_user: CurrentUser, db: SessionDep) -> Order:
    order = db.get(Order, order_id)
    if order is None or order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
