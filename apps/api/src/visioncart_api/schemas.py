"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import AssetPlatform, AssetStatus, AuthProvider, OrderStatus, UserRole

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=1)


class AppleAuthRequest(BaseModel):
    identity_token: str = Field(min_length=1)
    full_name: str | None = Field(default=None, max_length=200)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    role: UserRole
    auth_provider: AuthProvider
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    tokens: TokenPair


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str


class CategoryCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)


class CategoryUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=1, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    brand: str
    color: str
    description: str
    price_cents: int
    currency: str
    tryon_model_key: str
    preview_url: str
    seller_url: str = ""
    is_active: bool
    width_mm: float = 0.0
    height_mm: float = 0.0
    depth_mm: float = 0.0


class ProductCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=1, max_length=200)
    brand: str = Field(default="", max_length=120)
    color: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=4000)
    price_cents: int = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    tryon_model_key: str = Field(min_length=1, max_length=120)
    preview_url: str = Field(default="", max_length=1024)
    seller_url: str = Field(default="", max_length=1024)
    is_active: bool = True
    width_mm: float = Field(default=0.0, ge=0)
    height_mm: float = Field(default=0.0, ge=0)
    depth_mm: float = Field(default=0.0, ge=0)


class ProductUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    brand: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=4000)
    price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    tryon_model_key: str | None = Field(default=None, min_length=1, max_length=120)
    preview_url: str | None = Field(default=None, max_length=1024)
    seller_url: str | None = Field(default=None, max_length=1024)
    is_active: bool | None = None
    width_mm: float | None = Field(default=None, ge=0)
    height_mm: float | None = Field(default=None, ge=0)
    depth_mm: float | None = Field(default=None, ge=0)


class AssetResolveOut(BaseModel):
    product_id: int
    platform: AssetPlatform
    version: str
    status: AssetStatus
    uri: str
    checksum_sha256: str
    content_type: str
    byte_size: int
    root_node: str
    default_scale: float
    anchor_json: str
    width_mm: float
    height_mm: float
    depth_mm: float
    category: str
    development: bool


class FavoriteOut(BaseModel):
    product: ProductOut
    created_at: datetime


class GuestCreateResponse(BaseModel):
    guest_key: str


class GuestMergeRequest(BaseModel):
    guest_key: str = Field(min_length=8, max_length=64)
    idempotency_key: str = Field(min_length=8, max_length=64)


class TryOnSessionCreate(BaseModel):
    session_key: str = Field(min_length=8, max_length=64)
    product_id: int
    category: str = Field(min_length=1, max_length=32)
    outcome: str = Field(min_length=1, max_length=32)
    duration_ms: int = Field(ge=0, default=0)
    engine: str = Field(default="", max_length=64)
    device_tier: str = Field(default="", max_length=32)
    error_code: str | None = Field(default=None, max_length=64)
    guest_key: str | None = Field(default=None, max_length=64)


class TryOnSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_key: str
    product_id: int
    category: str
    outcome: str
    duration_ms: int
    created_at: datetime


class RecentlyTriedOut(BaseModel):
    product: ProductOut
    last_tried_at: datetime
    outcome: str


class AccountDeleteResponse(BaseModel):
    message: str
    deleted: bool = True


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=999)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=999)


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut
    line_total_cents: int


class CartOut(BaseModel):
    id: int
    items: list[CartItemOut]
    subtotal_cents: int
    currency: str


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    line1: str = Field(min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    postal_code: str = Field(min_length=1, max_length=40)
    country: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=1, max_length=40)


class OrderCreate(BaseModel):
    shipping: ShippingAddress
    notes: str | None = Field(default=None, max_length=2000)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    unit_price_cents: int
    quantity: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: OrderStatus
    subtotal_cents: int
    shipping_cents: int
    total_cents: int
    currency: str
    payment_method: str
    notes: str
    ship_full_name: str
    ship_line1: str
    ship_line2: str
    ship_city: str
    ship_state: str
    ship_postal_code: str
    ship_country: str
    ship_phone: str
    created_at: datetime
    items: list[OrderItemOut]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------


class MessageResponse(BaseModel):
    message: str
