"""Try-on session summaries and recently-tried products."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import OptionalUser, SessionDep
from ..models import Product, TryOnSession
from ..schemas import ProductOut, RecentlyTriedOut, TryOnSessionCreate, TryOnSessionOut

router = APIRouter(prefix="/tryon", tags=["tryon"])


@router.post("/sessions", response_model=TryOnSessionOut, status_code=status.HTTP_201_CREATED)
def record_session(
    body: TryOnSessionCreate,
    db: SessionDep,
    user: OptionalUser,
) -> TryOnSession:
    product = db.get(Product, body.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = db.scalar(
        select(TryOnSession).where(TryOnSession.session_key == body.session_key)
    )
    if existing is not None:
        return existing

    row = TryOnSession(
        session_key=body.session_key,
        user_id=user.id if user is not None else None,
        guest_key=body.guest_key if user is None else None,
        product_id=body.product_id,
        category=body.category,
        outcome=body.outcome,
        duration_ms=body.duration_ms,
        engine=body.engine,
        device_tier=body.device_tier,
        error_code=body.error_code,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/recent", response_model=list[RecentlyTriedOut])
def recent_tried(
    db: SessionDep,
    user: OptionalUser,
    guest_key: str | None = None,
) -> list[RecentlyTriedOut]:
    stmt = select(TryOnSession).order_by(TryOnSession.created_at.desc()).limit(50)
    if user is not None:
        stmt = stmt.where(TryOnSession.user_id == user.id)
    elif guest_key:
        stmt = stmt.where(TryOnSession.guest_key == guest_key)
    else:
        return []

    seen: set[int] = set()
    result: list[RecentlyTriedOut] = []
    for session in db.scalars(stmt).all():
        if session.product_id in seen:
            continue
        product = db.get(Product, session.product_id)
        if product is None or not product.is_active:
            continue
        seen.add(session.product_id)
        result.append(
            RecentlyTriedOut(
                product=ProductOut.model_validate(product),
                last_tried_at=session.created_at,
                outcome=session.outcome,
            )
        )
        if len(result) >= 20:
            break
    return result
