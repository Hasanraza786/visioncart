"""Build ingest-draft A0 packages from real GLB sources (USDZ still pending)."""

from __future__ import annotations

import json
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .glb import parse_glb
from .validation import SCHEMA_VERSION, sha256_file

# Category-required anchors live in fixtures; duplicate names here for packaging.
REQUIRED_ANCHORS: dict[str, tuple[str, ...]] = {
    "glasses": ("frame_root", "bridge_anchor", "left_temple", "right_temple"),
    "watch": ("watch_root", "dial_center", "strap_axis"),
    "ring": ("ring_root", "ring_center", "band_axis"),
    "earring": ("earring_root", "attachment_point"),
    "nose_pin": ("nose_pin_root", "attachment_point", "gem_center"),
}

PLAUSIBLE_DIMENSIONS_MM: dict[str, tuple[float, float, float]] = {
    "glasses": (140.0, 45.0, 145.0),
    "watch": (42.0, 48.0, 12.0),
    "ring": (22.0, 22.0, 6.0),
    "earring": (18.0, 28.0, 4.0),
    "nose_pin": (8.0, 8.0, 3.0),
}


@dataclass(frozen=True)
class IngestSpec:
    package_id: str
    category: str
    name: str
    source_note: str
    copyright: str
    source: str
    glb: Path


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()


def _mesh_bounds(glb_path: Path) -> tuple[list[float], list[float]]:
    doc = parse_glb(glb_path).json
    accessors = doc.get("accessors", [])
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for mesh in doc.get("meshes", []):
        if not isinstance(mesh, dict):
            continue
        for primitive in mesh.get("primitives", []):
            if not isinstance(primitive, dict):
                continue
            pos = primitive.get("attributes", {}).get("POSITION")
            if not isinstance(pos, int) or pos >= len(accessors):
                continue
            accessor = accessors[pos]
            if not isinstance(accessor, dict):
                continue
            amin = accessor.get("min")
            amax = accessor.get("max")
            if not isinstance(amin, list) or not isinstance(amax, list) or len(amin) < 3:
                continue
            for axis in range(3):
                mins[axis] = min(mins[axis], float(amin[axis]))
                maxs[axis] = max(maxs[axis], float(amax[axis]))
    if mins[0] == float("inf"):
        return [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]
    return mins, maxs


def _center(mins: list[float], maxs: list[float]) -> list[float]:
    return [(mins[i] + maxs[i]) / 2.0 for i in range(3)]


def _anchors_for(category: str, mins: list[float], maxs: list[float]) -> list[dict[str, Any]]:
    center = _center(mins, maxs)
    extent = [maxs[i] - mins[i] for i in range(3)]
    identity = [0.0, 0.0, 0.0, 1.0]
    positions: dict[str, list[float]] = {
        "frame_root": center,
        "bridge_anchor": [center[0], center[1], maxs[2]],
        "left_temple": [mins[0], center[1], center[2]],
        "right_temple": [maxs[0], center[1], center[2]],
        "watch_root": center,
        "dial_center": [center[0], center[1], maxs[2]],
        "strap_axis": [center[0], mins[1], center[2]],
        "ring_root": center,
        "ring_center": center,
        "band_axis": [center[0], center[1] - extent[1] * 0.25, center[2]],
        "earring_root": center,
        "attachment_point": [center[0], maxs[1], center[2]],
        "nose_pin_root": center,
        "gem_center": [center[0], center[1], maxs[2]],
    }
    return [
        {"name": name, "position": positions[name], "rotation": identity}
        for name in REQUIRED_ANCHORS[category]
    ]


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def solid_png(width: int, height: int, rgb: tuple[int, int, int]) -> bytes:
    """Write a deterministic solid-color PNG without third-party deps."""
    r, g, b = rgb
    row = b"\x00" + bytes([r, g, b]) * width
    raw = row * height
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", zlib.compress(raw, 9))
        + _png_chunk(b"IEND", b"")
    )


def extract_preview_png(glb_path: Path, fallback_rgb: tuple[int, int, int]) -> bytes:
    """Prefer an embedded PNG texture; otherwise emit a solid category preview."""
    doc = parse_glb(glb_path).json
    images = doc.get("images", [])
    views = doc.get("bufferViews", [])
    buffers = doc.get("buffers", [])
    if not isinstance(images, list) or not images:
        return solid_png(256, 256, fallback_rgb)

    binary = glb_path.read_bytes()
    # Skip GLB header + JSON chunk to locate BIN payload start.
    json_length = struct.unpack_from("<I", binary, 12)[0]
    bin_start = 12 + 8 + json_length + 8

    for image in images:
        if not isinstance(image, dict):
            continue
        mime = image.get("mimeType")
        view_id = image.get("bufferView")
        if mime != "image/png" or not isinstance(view_id, int) or view_id >= len(views):
            continue
        view = views[view_id]
        if not isinstance(view, dict):
            continue
        offset = int(view.get("byteOffset", 0))
        length = int(view.get("byteLength", 0))
        buffer_id = int(view.get("buffer", 0))
        if buffer_id != 0 or not isinstance(buffers, list):
            continue
        payload = binary[bin_start + offset : bin_start + offset + length]
        if payload.startswith(b"\x89PNG\r\n\x1a\n"):
            return payload
    return solid_png(256, 256, fallback_rgb)


PREVIEW_COLORS: dict[str, tuple[int, int, int]] = {
    "glasses": (40, 90, 140),
    "watch": (60, 60, 70),
    "ring": (180, 140, 60),
    "earring": (150, 90, 120),
    "nose_pin": (120, 120, 160),
}


def build_ingest_package(root: Path, spec: IngestSpec, *, overwrite: bool = False) -> Path:
    if spec.category not in REQUIRED_ANCHORS:
        raise ValueError(f"unsupported category: {spec.category}")
    if not spec.glb.is_file():
        raise FileNotFoundError(spec.glb)

    package_dir = root / spec.category / spec.package_id
    if package_dir.exists():
        if not overwrite:
            raise FileExistsError(f"refusing to overwrite package: {package_dir}")
        for path in sorted(package_dir.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()

    assets = package_dir / "assets"
    assets.mkdir(parents=True)

    model_path = assets / "model.glb"
    model_path.write_bytes(spec.glb.read_bytes())

    preview_path = assets / "preview.png"
    preview_path.write_bytes(
        extract_preview_png(model_path, PREVIEW_COLORS.get(spec.category, (80, 80, 80)))
    )

    usdz_placeholder = assets / "model.usdz.placeholder.txt"
    usdz_placeholder.write_text(
        "INGEST-DRAFT PLACEHOLDER ONLY\n"
        "Real GLB ingested and optimized; USDZ conversion toolchain is not pinned yet.\n"
        "Do not treat this file as a USDZ asset.\n",
        encoding="utf-8",
    )

    width, height, depth = PLAUSIBLE_DIMENSIONS_MM[spec.category]
    mins, maxs = _mesh_bounds(model_path)

    (package_dir / "product.json").write_bytes(
        _json_bytes(
            {
                "category": spec.category,
                "dimensionsMm": {"depth": depth, "height": height, "width": width},
                "name": spec.name,
                "productId": spec.package_id,
                "schemaVersion": SCHEMA_VERSION,
                "sourceNote": spec.source_note,
                "synthetic": False,
            }
        )
    )
    (package_dir / "anchors.json").write_bytes(
        _json_bytes(
            {
                "anchors": _anchors_for(spec.category, mins, maxs),
                "coordinateSystem": "right-handed-y-up",
                "schemaVersion": SCHEMA_VERSION,
                "units": "meters",
            }
        )
    )
    (package_dir / "license.json").write_bytes(
        _json_bytes(
            {
                "copyright": spec.copyright,
                "restrictions": [
                    "Commercial use blocked until SPDX license is verified against the original source",
                    "USDZ derivative pending; package status is ingest-draft",
                    "Not approved as a production-candidate A0 asset",
                ],
                "schemaVersion": SCHEMA_VERSION,
                "source": spec.source,
                "spdxId": "LicenseRef-PendingVerification",
                "synthetic": False,
            }
        )
    )

    file_specs = (
        ("assets/model.glb", "model-gltf", "model/gltf-binary", False),
        (
            "assets/model.usdz.placeholder.txt",
            "model-usdz",
            "application/vnd.visioncart.ingest-usdz-placeholder",
            True,
        ),
        ("assets/preview.png", "preview", "image/png", False),
    )
    files = []
    for relative, role, media_type, placeholder in file_specs:
        path = package_dir / relative
        files.append(
            {
                "bytes": path.stat().st_size,
                "mediaType": media_type,
                "path": relative,
                "placeholder": placeholder,
                "role": role,
                "sha256": sha256_file(path),
            }
        )

    (package_dir / "package.json").write_bytes(
        _json_bytes(
            {
                "anchors": "anchors.json",
                "category": spec.category,
                "files": files,
                "license": "license.json",
                "packageId": spec.package_id,
                "phase": "A0",
                "product": "product.json",
                "schemaVersion": SCHEMA_VERSION,
                "status": "ingest-draft",
            }
        )
    )
    return package_dir


DEFAULT_MOBILE_SPECS: tuple[tuple[str, str, str, str], ...] = (
    (
        "ingest-glasses-sun",
        "glasses",
        "Sun Glasses",
        "glasses.glb",
    ),
    (
        "ingest-ring-lowpoly",
        "ring",
        "Low Poly Ring",
        "ring.glb",
    ),
    (
        "ingest-watch-classic",
        "watch",
        "Classic Watch",
        "watch.glb",
    ),
    (
        "ingest-earring-diamond",
        "earring",
        "Diamond Earrings",
        "earring.glb",
    ),
    (
        "ingest-nose-pin-heart",
        "nose_pin",
        "Heart Septum Nose Pin",
        "nose_pin.glb",
    ),
)


def build_default_mobile_packages(
    optimized_dir: Path,
    packages_root: Path,
    *,
    overwrite: bool = False,
) -> list[Path]:
    built: list[Path] = []
    for package_id, category, name, filename in DEFAULT_MOBILE_SPECS:
        glb = optimized_dir / filename
        built.append(
            build_ingest_package(
                packages_root,
                IngestSpec(
                    package_id=package_id,
                    category=category,
                    name=name,
                    source_note=(
                        "Optimized from Sketchfab-exported GLB placed in the mobile assets "
                        "folder. Mesh scale is not millimetre-authored; dimensionsMm uses "
                        "category-plausible draft values until measured."
                    ),
                    copyright=(
                        "Original authors via Sketchfab download; license verification pending."
                    ),
                    source=f"Optimized from local source model {filename}",
                    glb=glb,
                ),
                overwrite=overwrite,
            )
        )
    return built
