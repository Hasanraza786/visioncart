"""Guest identity + merge + account deletion."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep
from ..models import GuestIdentity, TryOnSession
from ..schemas import (
    AccountDeleteResponse,
    GuestCreateResponse,
    GuestMergeRequest,
    MessageResponse,
)
from ..security import hash_password

router = APIRouter(tags=["guests"])


@router.post("/guests", response_model=GuestCreateResponse, status_code=status.HTTP_201_CREATED)
def create_guest(db: SessionDep) -> GuestCreateResponse:
    guest_key = secrets.token_urlsafe(24)
    db.add(GuestIdentity(guest_key=guest_key))
    db.commit()
    return GuestCreateResponse(guest_key=guest_key)


@router.post("/guests/merge", response_model=MessageResponse)
def merge_guest(body: GuestMergeRequest, db: SessionDep, user: CurrentUser) -> MessageResponse:
    guest = db.scalar(select(GuestIdentity).where(GuestIdentity.guest_key == body.guest_key))
    if guest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
    if guest.merged_user_id is not None:
        # Idempotent: already merged.
        return MessageResponse(message="Already merged")

    # Move try-on sessions owned by guest onto the authenticated user.
    sessions = db.scalars(
        select(TryOnSession).where(TryOnSession.guest_key == body.guest_key)
    ).all()
    for session in sessions:
        session.user_id = user.id
        session.guest_key = None

    guest.merged_user_id = user.id
    guest.merged_at = datetime.now(UTC)
    db.commit()
    return MessageResponse(message="Merged")


@router.delete("/account", response_model=AccountDeleteResponse)
def delete_account(db: SessionDep, user: CurrentUser) -> AccountDeleteResponse:
    """Soft-delete account: anonymize email and mark deleted_at."""
    if user.deleted_at is not None:
        return AccountDeleteResponse(message="Already deleted", deleted=True)

    # Remove favorites; keep order history anonymized under the soft-deleted user.
    for fav in list(user.favorites):
        db.delete(fav)

    user.email = f"deleted+{user.id}@visioncart.invalid"
    user.name = "Deleted User"
    user.password_hash = hash_password(secrets.token_urlsafe(32))
    user.provider_subject = None
    user.deleted_at = datetime.now(UTC)
    db.commit()
    return AccountDeleteResponse(message="Account deleted", deleted=True)
