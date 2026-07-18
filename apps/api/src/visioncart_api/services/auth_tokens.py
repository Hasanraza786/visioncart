"""Verification of third-party identity tokens (Google & Apple).

The backend owns authentication: it verifies the provider's signed token and
then issues its own VisionCart JWTs. We never rely on Firebase Auth.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import jwt
import requests
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jwt.algorithms import RSAAlgorithm

from ..config import get_settings

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"

# Cache Apple's JWKS briefly so we don't hit the network on every login.
_apple_jwks_cache: dict[str, Any] | None = None


@dataclass(slots=True)
class SocialIdentity:
    """Normalized identity extracted from a verified provider token."""

    provider_subject: str
    email: str
    name: str
    email_verified: bool


class SocialAuthNotConfigured(Exception):
    """Raised when the provider has no configured client IDs (-> HTTP 503)."""


class SocialAuthError(Exception):
    """Raised when a provider token fails verification (-> HTTP 401)."""


def verify_google_id_token(token: str) -> SocialIdentity:
    """Verify a Google ID token and return the normalized identity."""
    settings = get_settings()
    allowed = settings.google_client_id_list
    if not allowed:
        raise SocialAuthNotConfigured(
            "Google sign-in is not configured. Set VISIONCART_GOOGLE_CLIENT_IDS."
        )

    try:
        # audience=None -> verify signature/expiry, then check aud manually so we
        # can support multiple client IDs (web, iOS, Android).
        claims = google_id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
            token, google_requests.Request(), audience=None
        )
    except Exception as exc:  # google raises ValueError/GoogleAuthError variants
        raise SocialAuthError("Invalid Google ID token") from exc

    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise SocialAuthError("Invalid Google token issuer")
    if claims.get("aud") not in allowed:
        raise SocialAuthError("Google token audience mismatch")

    subject = claims.get("sub")
    email = claims.get("email")
    if not subject or not email:
        raise SocialAuthError("Google token missing subject or email")

    return SocialIdentity(
        provider_subject=str(subject),
        email=str(email).lower(),
        name=str(claims.get("name") or ""),
        email_verified=bool(claims.get("email_verified", False)),
    )


def _fetch_apple_jwks(*, force: bool = False) -> dict[str, Any]:
    """Fetch Apple JWKS via requests (certifi SSL) — urllib fails on some macOS Pythons."""
    global _apple_jwks_cache
    if _apple_jwks_cache is not None and not force:
        return _apple_jwks_cache
    try:
        response = requests.get(APPLE_JWKS_URL, timeout=15)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        raise SocialAuthError("Unable to fetch Apple signing keys") from exc
    if not isinstance(payload, dict) or "keys" not in payload:
        raise SocialAuthError("Invalid Apple JWKS response")
    _apple_jwks_cache = payload
    return payload


def _apple_signing_key(token: str) -> Any:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise SocialAuthError("Apple token missing key id")

    jwks = _fetch_apple_jwks()
    key = next((item for item in jwks.get("keys", []) if item.get("kid") == kid), None)
    if key is None:
        # Key rotation: refresh once and retry.
        jwks = _fetch_apple_jwks(force=True)
        key = next((item for item in jwks.get("keys", []) if item.get("kid") == kid), None)
    if key is None:
        raise SocialAuthError("Apple signing key not found")
    return RSAAlgorithm.from_jwk(key)


def verify_apple_identity_token(token: str, full_name: str | None = None) -> SocialIdentity:
    """Verify an Apple identity token via Apple's JWKS."""
    settings = get_settings()
    allowed = settings.apple_client_id_list
    if not allowed:
        raise SocialAuthNotConfigured(
            "Apple sign-in is not configured. Set VISIONCART_APPLE_CLIENT_IDS."
        )

    try:
        signing_key = _apple_signing_key(token)
        # Decode without audience first so we can support multiple App IDs /
        # Services IDs cleanly, then enforce aud manually.
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=APPLE_ISSUER,
            options={"require": ["exp", "sub", "iss", "aud"], "verify_aud": False},
            leeway=60,
        )
    except SocialAuthError:
        raise
    except jwt.PyJWTError as exc:
        raise SocialAuthError(f"Invalid Apple identity token: {exc}") from exc

    audience = claims.get("aud")
    audiences = audience if isinstance(audience, list) else [audience]
    if not any(item in allowed for item in audiences):
        raise SocialAuthError(
            f"Apple token audience mismatch (got {audience!r}, allowed {allowed})"
        )

    subject = claims.get("sub")
    if not subject:
        raise SocialAuthError("Apple token missing subject")

    # Apple only returns email on first authorization; it may be absent later.
    email = claims.get("email")
    resolved_email = str(email).lower() if email else f"{subject}@privaterelay.appleid.com"

    email_verified_raw = claims.get("email_verified", False)
    email_verified = (
        email_verified_raw is True
        or email_verified_raw == "true"
        or email_verified_raw == "True"
    )

    return SocialIdentity(
        provider_subject=str(subject),
        email=resolved_email,
        name=full_name or "",
        email_verified=email_verified,
    )
