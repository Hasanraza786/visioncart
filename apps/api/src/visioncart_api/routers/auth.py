"""Backend-owned authentication endpoints."""

from __future__ import annotations

import jwt
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep
from ..models import AuthProvider, User, UserRole
from ..schemas import (
    AppleAuthRequest,
    AuthResponse,
    GoogleAuthRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)
from ..security import (
    access_token_ttl_seconds,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from ..services.auth_tokens import (
    SocialAuthError,
    SocialAuthNotConfigured,
    SocialIdentity,
    verify_apple_identity_token,
    verify_google_id_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=access_token_ttl_seconds(),
    )


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(user=UserOut.model_validate(user), tokens=_issue_tokens(user))


def _get_user_by_email(db: SessionDep, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def _upsert_social_user(
    db: SessionDep, identity: SocialIdentity, provider: AuthProvider
) -> User:
    user = db.scalar(
        select(User).where(
            User.auth_provider == provider,
            User.provider_subject == identity.provider_subject,
        )
    )
    if user is None:
        user = _get_user_by_email(db, identity.email)

    if user is None:
        user = User(
            email=identity.email,
            name=identity.name,
            role=UserRole.customer,
            auth_provider=provider,
            provider_subject=identity.provider_subject,
        )
        db.add(user)
    else:
        # Link/refresh provider metadata on the existing account.
        user.provider_subject = identity.provider_subject
        if user.auth_provider == AuthProvider.email:
            user.auth_provider = provider
        if not user.name and identity.name:
            user.name = identity.name

    db.commit()
    db.refresh(user)
    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: SessionDep) -> AuthResponse:
    email = payload.email.lower()
    if _get_user_by_email(db, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = User(
        email=email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        role=UserRole.customer,
        auth_provider=AuthProvider.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: SessionDep) -> AuthResponse:
    user = _get_user_by_email(db, payload.email.lower())
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    return _auth_response(user)


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, db: SessionDep) -> AuthResponse:
    try:
        identity = verify_google_id_token(payload.id_token)
    except SocialAuthNotConfigured as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except SocialAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    user = _upsert_social_user(db, identity, AuthProvider.google)
    return _auth_response(user)


@router.post("/apple", response_model=AuthResponse)
def apple_auth(payload: AppleAuthRequest, db: SessionDep) -> AuthResponse:
    try:
        identity = verify_apple_identity_token(payload.identity_token, payload.full_name)
    except SocialAuthNotConfigured as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except SocialAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    user = _upsert_social_user(db, identity, AuthProvider.apple)
    return _auth_response(user)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: SessionDep) -> TokenPair:
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        ) from exc

    try:
        user_id = int(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token subject"
        ) from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _issue_tokens(user)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser) -> User:
    return current_user
