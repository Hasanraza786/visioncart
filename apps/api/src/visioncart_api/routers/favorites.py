"""Favorites endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep
from ..models import Favorite, Product
from ..schemas import FavoriteOut, MessageResponse, ProductOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteOut])
def list_favorites(db: SessionDep, user: CurrentUser) -> list[FavoriteOut]:
    rows = db.scalars(
        select(Favorite)
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    ).all()
    result: list[FavoriteOut] = []
    for fav in rows:
        product = db.get(Product, fav.product_id)
        if product is None or not product.is_active:
            continue
        result.append(
            FavoriteOut(product=ProductOut.model_validate(product), created_at=fav.created_at)
        )
    return result


@router.post("/{product_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(product_id: int, db: SessionDep, user: CurrentUser) -> MessageResponse:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    existing = db.scalar(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.product_id == product_id)
    )
    if existing is None:
        db.add(Favorite(user_id=user.id, product_id=product_id))
        db.commit()
    return MessageResponse(message="Favorited")


@router.delete("/{product_id}", response_model=MessageResponse)
def remove_favorite(product_id: int, db: SessionDep, user: CurrentUser) -> MessageResponse:
    existing = db.scalar(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.product_id == product_id)
    )
    if existing is not None:
        db.delete(existing)
        db.commit()
    return MessageResponse(message="Removed")
