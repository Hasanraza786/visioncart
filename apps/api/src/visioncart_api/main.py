"""VisionCart API application entrypoint."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db
from .middleware import RequestIdMiddleware
from .routers import admin, assets, auth, cart, catalog, favorites, guests, orders, tryon


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Ensure tables exist (Alembic is the source of truth for production upgrades).
    init_db()
    yield


app = FastAPI(
    title="VisionCart API",
    version="0.2.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.2.0"}


app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(assets.router)
app.include_router(favorites.router)
app.include_router(guests.router)
app.include_router(tryon.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)
