"""Deterministic, visibly synthetic fixtures for contract tests and demos."""

from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any

from .validation import CATEGORIES, SCHEMA_VERSION, sha256_file

PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d4944415408d763f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082"
)

ANCHORS: dict[str, tuple[str, ...]] = {
    "glasses": ("frame_root", "bridge_anchor", "left_temple", "right_temple"),
    "watch": ("watch_root", "dial_center", "strap_axis"),
    "ring": ("ring_root", "ring_center", "band_axis"),
    "earring": ("earring_root", "attachment_point"),
    "nose_pin": ("nose_pin_root", "attachment_point", "gem_center"),
}

DIMENSIONS: dict[str, tuple[float, float, float]] = {
    "glasses": (140, 45, 145),
    "watch": (42, 48, 12),
    "ring": (22, 22, 6),
    "earring": (18, 28, 4),
    "nose_pin": (8, 8, 3),
}


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()


def tiny_triangle_glb() -> bytes:
    """Create one valid, deterministic GLB containing a single triangle."""
    positions = struct.pack("<9f", 0.0, 0.0, 0.0, 0.01, 0.0, 0.0, 0.0, 0.01, 0.0)
    indices = struct.pack("<3H", 0, 1, 2)
    binary = positions + indices + b"\x00\x00"
    document = {
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": 3,
                "max": [0.01, 0.01, 0.0],
                "min": [0.0, 0.0, 0.0],
                "type": "VEC3",
            },
            {"bufferView": 1, "componentType": 5123, "count": 3, "type": "SCALAR"},
        ],
        "asset": {"generator": "VisionCart deterministic synthetic fixture", "version": "2.0"},
        "bufferViews": [
            {"buffer": 0, "byteLength": len(positions), "byteOffset": 0, "target": 34962},
            {
                "buffer": 0,
                "byteLength": len(indices),
                "byteOffset": len(positions),
                "target": 34963,
            },
        ],
        "buffers": [{"byteLength": len(binary)}],
        "meshes": [
            {
                "name": "SYNTHETIC_TRIANGLE",
                "primitives": [{"attributes": {"POSITION": 0}, "indices": 1}],
            }
        ],
        "nodes": [{"mesh": 0, "name": "SYNTHETIC_DRAFT_ONLY"}],
        "scene": 0,
        "scenes": [{"nodes": [0]}],
    }
    json_chunk = json.dumps(document, separators=(",", ":"), sort_keys=True).encode()
    json_chunk += b" " * (-len(json_chunk) % 4)
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary)
    return (
        struct.pack("<4sII", b"glTF", 2, total_length)
        + struct.pack("<II", len(json_chunk), 0x4E4F534A)
        + json_chunk
        + struct.pack("<II", len(binary), 0x004E4942)
        + binary
    )


def generate_fixture(root: Path, category: str) -> Path:
    if category not in CATEGORIES:
        raise ValueError(f"unsupported category: {category}")
    package_id = f"synthetic-{category.replace('_', '-')}"
    package_dir = root / category / package_id
    if package_dir.exists():
        raise FileExistsError(f"refusing to overwrite fixture: {package_dir}")
    assets = package_dir / "assets"
    assets.mkdir(parents=True)

    width, height, depth = DIMENSIONS[category]
    (package_dir / "product.json").write_bytes(
        _json_bytes(
            {
                "category": category,
                "dimensionsMm": {"depth": depth, "height": height, "width": width},
                "name": f"Synthetic {category.replace('_', ' ').title()} Draft",
                "productId": package_id,
                "schemaVersion": SCHEMA_VERSION,
                "sourceNote": (
                    "Procedurally generated contract fixture; "
                    "not a production scan or conversion."
                ),
                "synthetic": True,
            }
        )
    )
    (package_dir / "anchors.json").write_bytes(
        _json_bytes(
            {
                "anchors": [
                    {
                        "name": name,
                        "position": [0.0, 0.0, 0.0],
                        "rotation": [0.0, 0.0, 0.0, 1.0],
                    }
                    for name in ANCHORS[category]
                ],
                "coordinateSystem": "right-handed-y-up",
                "schemaVersion": SCHEMA_VERSION,
                "units": "meters",
            }
        )
    )
    (package_dir / "license.json").write_bytes(
        _json_bytes(
            {
                "copyright": "No external source; generated synthetic geometry.",
                "restrictions": ["Contract testing only", "Not approved as a production asset"],
                "schemaVersion": SCHEMA_VERSION,
                "source": "VisionCart deterministic fixture generator",
                "spdxId": "CC0-1.0",
                "synthetic": True,
            }
        )
    )
    (assets / "model.glb").write_bytes(tiny_triangle_glb())
    (assets / "model.usdz.placeholder.txt").write_text(
        "SYNTHETIC PLACEHOLDER ONLY\n"
        "This is not a USDZ file and does not claim conversion or device compatibility.\n",
        encoding="utf-8",
    )
    (assets / "preview.png").write_bytes(PNG_1X1)

    file_specs = (
        ("assets/model.glb", "model-gltf", "model/gltf-binary"),
        (
            "assets/model.usdz.placeholder.txt",
            "model-usdz",
            "application/vnd.visioncart.synthetic-usdz-placeholder",
        ),
        ("assets/preview.png", "preview", "image/png"),
    )
    files = []
    for relative, role, media_type in file_specs:
        path = package_dir / relative
        files.append(
            {
                "bytes": path.stat().st_size,
                "mediaType": media_type,
                "path": relative,
                "placeholder": True,
                "role": role,
                "sha256": sha256_file(path),
            }
        )
    (package_dir / "package.json").write_bytes(
        _json_bytes(
            {
                "anchors": "anchors.json",
                "category": category,
                "files": files,
                "license": "license.json",
                "packageId": package_id,
                "phase": "A0",
                "product": "product.json",
                "schemaVersion": SCHEMA_VERSION,
                "status": "synthetic-draft",
            }
        )
    )
    return package_dir


def generate_all_fixtures(root: Path) -> list[Path]:
    return [generate_fixture(root, category) for category in CATEGORIES]
