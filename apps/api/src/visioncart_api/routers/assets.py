"""Platform asset resolution for try-on."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from ..config import get_settings
from ..deps import SessionDep
from ..models import AssetPlatform, AssetStatus, AssetVersion, Category, Product
from ..schemas import AssetResolveOut

router = APIRouter(prefix="/assets", tags=["assets"])

# Development fallbacks when no AssetVersion row exists yet — maps tryon_model_key
# to bundled mobile asset metadata (checksums filled by seed where available).
_DEV_DEFAULTS: dict[str, dict[str, object]] = {
    "glasses": {
        "uri": "bundled://glasses.glb",
        "checksum": "dev",
        "root": "root",
        "w": 140.0,
        "h": 45.0,
        "d": 145.0,
    },
    "watch": {
        "uri": "bundled://watch.glb",
        "checksum": "dev",
        "root": "root",
        "w": 42.0,
        "h": 42.0,
        "d": 12.0,
    },
    "ring": {
        "uri": "bundled://ring.glb",
        "checksum": "dev",
        "root": "root",
        "w": 20.0,
        "h": 20.0,
        "d": 8.0,
    },
    "earring": {
        "uri": "bundled://earring.glb",
        "checksum": "dev",
        "root": "root",
        "w": 12.0,
        "h": 30.0,
        "d": 8.0,
    },
    "nose_pin": {
        "uri": "bundled://nose_pin.glb",
        "checksum": "dev",
        "root": "root",
        "w": 6.0,
        "h": 6.0,
        "d": 4.0,
    },
}


@router.get("/resolve/{product_id}", response_model=AssetResolveOut)
def resolve_asset(
    product_id: int,
    db: SessionDep,
    platform: AssetPlatform = Query(default=AssetPlatform.shared),  # noqa: B008
) -> AssetResolveOut:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    category = db.get(Category, product.category_id)
    category_slug = category.slug if category else product.tryon_model_key
    settings = get_settings()
    is_prod = settings.env == "production"

    stmt = (
        select(AssetVersion)
        .where(AssetVersion.product_id == product_id)
        .order_by(AssetVersion.created_at.desc())
    )
    versions = list(db.scalars(stmt).all())
    chosen: AssetVersion | None = None
    development_fallback: AssetVersion | None = None
    for ver in versions:
        if ver.platform not in (platform, AssetPlatform.shared):
            continue
        if ver.status == AssetStatus.deprecated:
            continue
        if ver.status in (AssetStatus.approved, AssetStatus.published):
            chosen = ver
            break
        if development_fallback is None and ver.status == AssetStatus.development:
            development_fallback = ver

    # Production prefers approved/published; until those exist, serve development
    # assets explicitly flagged so clients can show non-sizing disclaimers.
    if chosen is None:
        chosen = development_fallback

    if chosen is not None:
        return AssetResolveOut(
            product_id=product.id,
            platform=chosen.platform,
            version=chosen.version,
            status=chosen.status,
            uri=chosen.uri,
            checksum_sha256=chosen.checksum_sha256,
            content_type=chosen.content_type,
            byte_size=chosen.byte_size,
            root_node=chosen.root_node,
            default_scale=chosen.default_scale,
            anchor_json=chosen.anchor_json,
            width_mm=product.width_mm or float(_DEV_DEFAULTS.get(category_slug, {}).get("w", 0)),
            height_mm=product.height_mm or float(_DEV_DEFAULTS.get(category_slug, {}).get("h", 0)),
            depth_mm=product.depth_mm or float(_DEV_DEFAULTS.get(category_slug, {}).get("d", 0)),
            category=category_slug,
            development=chosen.status == AssetStatus.development,
        )

    # Development fallback to bundled assets.
    if is_prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No approved asset for this product",
        )

    defaults = _DEV_DEFAULTS.get(product.tryon_model_key) or _DEV_DEFAULTS.get(category_slug)
    if defaults is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No try-on asset")

    return AssetResolveOut(
        product_id=product.id,
        platform=AssetPlatform.shared,
        version="dev-1.0.0",
        status=AssetStatus.development,
        uri=str(defaults["uri"]),
        checksum_sha256=str(defaults["checksum"]),
        content_type="model/gltf-binary",
        byte_size=0,
        root_node=str(defaults["root"]),
        default_scale=1.0,
        anchor_json=json.dumps({"version": "1.0.0", "rootNode": defaults["root"]}),
        width_mm=product.width_mm or float(defaults["w"]),
        height_mm=product.height_mm or float(defaults["h"]),
        depth_mm=product.depth_mm or float(defaults["d"]),
        category=category_slug,
        development=True,
    )
