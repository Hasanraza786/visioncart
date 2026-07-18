"""Schema, checksum, package, and category-policy validation."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator  # type: ignore[import-untyped]

from .glb import GlbError, GlbInfo, parse_glb

SCHEMA_VERSION = "1.0.0"
CATEGORIES = ("glasses", "watch", "ring", "earring", "nose_pin")
SCHEMA_ROOT = Path(__file__).resolve().parents[4] / "packages" / "contracts" / "schemas"

REQUIRED_ANCHORS: dict[str, frozenset[str]] = {
    "glasses": frozenset({"frame_root", "bridge_anchor", "left_temple", "right_temple"}),
    "watch": frozenset({"watch_root", "dial_center", "strap_axis"}),
    "ring": frozenset({"ring_root", "ring_center", "band_axis"}),
    "earring": frozenset({"earring_root", "attachment_point"}),
    "nose_pin": frozenset({"nose_pin_root", "attachment_point", "gem_center"}),
}
MAX_DIMENSION_MM = {
    "glasses": 250,
    "watch": 100,
    "ring": 50,
    "earring": 100,
    "nose_pin": 30,
}
MAX_GLB_BYTES = {
    "glasses": 8 * 1024 * 1024,
    "watch": 12 * 1024 * 1024,
    "ring": 6 * 1024 * 1024,
    "earring": 7 * 1024 * 1024,
    "nose_pin": 4 * 1024 * 1024,
}
MAX_TRIANGLES = {
    "glasses": 30_000,
    "watch": 45_000,
    "ring": 20_000,
    "earring": 25_000,
    "nose_pin": 12_000,
}


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str


@dataclass(frozen=True)
class ValidationReport:
    package: Path
    package_id: str | None
    category: str | None
    issues: tuple[ValidationIssue, ...]

    @property
    def valid(self) -> bool:
        return not self.issues

    def as_dict(self) -> dict[str, Any]:
        return {
            "package": str(self.package),
            "packageId": self.package_id,
            "category": self.category,
            "valid": self.valid,
            "issues": [{"code": issue.code, "message": issue.message} for issue in self.issues],
        }


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    """Hash a file incrementally so large model files are never buffered whole."""
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def validate_schema(document: dict[str, Any], schema_name: str) -> list[str]:
    schema = load_json(SCHEMA_ROOT / f"{schema_name}.schema.json")
    validator = Draft202012Validator(schema)
    return [
        f"{'/'.join(str(part) for part in error.absolute_path) or '<root>'}: {error.message}"
        for error in sorted(validator.iter_errors(document), key=lambda item: list(item.path))
    ]


def discover_packages(root: Path) -> list[Path]:
    """Find only package.json files that identify themselves as A0 asset metadata."""
    candidates = [root] if root.is_file() else root.rglob("package.json")
    found: list[Path] = []
    for candidate in candidates:
        try:
            data = load_json(candidate)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
        if data.get("phase") == "A0" and data.get("schemaVersion") == SCHEMA_VERSION:
            found.append(candidate.parent)
    return sorted(found)


def _triangle_count(info: GlbInfo) -> int:
    accessors = info.json.get("accessors", [])
    meshes = info.json.get("meshes", [])
    if not isinstance(accessors, list) or not isinstance(meshes, list):
        return 0
    triangles = 0
    for mesh in meshes:
        if not isinstance(mesh, dict) or not isinstance(mesh.get("primitives"), list):
            continue
        for primitive in mesh["primitives"]:
            if not isinstance(primitive, dict) or primitive.get("mode", 4) != 4:
                continue
            index = primitive.get("indices")
            if isinstance(index, int) and 0 <= index < len(accessors):
                accessor = accessors[index]
                if isinstance(accessor, dict) and isinstance(accessor.get("count"), int):
                    triangles += accessor["count"] // 3
    return triangles


def validate_package(package_dir: Path) -> ValidationReport:
    package_dir = package_dir.resolve()
    issues: list[ValidationIssue] = []

    def issue(code: str, message: str) -> None:
        issues.append(ValidationIssue(code, message))

    documents: dict[str, dict[str, Any]] = {}
    for name in ("package", "product", "anchors", "license"):
        path = package_dir / f"{name}.json"
        try:
            documents[name] = load_json(path)
        except (OSError, ValueError, json.JSONDecodeError) as error:
            issue("metadata", f"{path.name}: {error}")

    metadata = documents.get("package", {})
    product = documents.get("product", {})
    anchors = documents.get("anchors", {})
    license_data = documents.get("license", {})
    for name, document in documents.items():
        for message in validate_schema(document, name):
            issue("schema", f"{name}.json: {message}")

    category = metadata.get("category")
    package_id = metadata.get("packageId")
    if product.get("category") != category:
        issue("consistency", "product category does not match package category")
    if product.get("productId") != package_id:
        issue("consistency", "productId does not match packageId")

    status = metadata.get("status")
    if status == "synthetic-draft":
        if product.get("synthetic") is not True or license_data.get("synthetic") is not True:
            issue("truthfulness", "synthetic-draft requires synthetic product and license flags")
        if any(item.get("placeholder") is not True for item in metadata.get("files", [])):
            issue("truthfulness", "synthetic-draft files must be marked as placeholders")
    elif status == "ingest-draft":
        if product.get("synthetic") is not False or license_data.get("synthetic") is not False:
            issue("truthfulness", "ingest-draft requires non-synthetic product and license flags")
    elif status == "production-candidate":
        if product.get("synthetic") is not False or license_data.get("synthetic") is not False:
            issue("truthfulness", "production-candidate cannot use synthetic metadata")
        if any(item.get("placeholder") is not False for item in metadata.get("files", [])):
            issue("truthfulness", "production-candidate cannot contain placeholders")

    file_entries = metadata.get("files", [])
    if not isinstance(file_entries, list):
        file_entries = []
    roles: set[str] = set()
    glb_info: GlbInfo | None = None
    for entry in file_entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            continue
        roles.add(str(entry.get("role")))
        relative = Path(entry["path"])
        path = (package_dir / relative).resolve()
        if package_dir not in path.parents:
            issue("path", f"file escapes package directory: {relative}")
            continue
        if not path.is_file():
            issue("file", f"missing declared file: {relative}")
            continue
        if path.stat().st_size != entry.get("bytes"):
            issue("size", f"byte count mismatch: {relative}")
        if sha256_file(path) != entry.get("sha256"):
            issue("checksum", f"SHA-256 mismatch: {relative}")
        if entry.get("role") == "model-gltf":
            if path.suffix.lower() != ".glb" or entry.get("mediaType") != "model/gltf-binary":
                issue("format", "model-gltf must be a .glb with model/gltf-binary media type")
            if status == "ingest-draft" and entry.get("placeholder") is not False:
                issue("truthfulness", "ingest-draft model-gltf cannot be a placeholder")
            try:
                glb_info = parse_glb(path)
            except GlbError as error:
                issue("glb", f"{relative}: {error}")
        elif entry.get("role") == "model-usdz" and status == "production-candidate":
            if path.suffix.lower() != ".usdz" or entry.get("mediaType") != "model/vnd.usdz+zip":
                issue("format", "production model-usdz must be a .usdz with the USDZ media type")
            with path.open("rb") as stream:
                if stream.read(4) != b"PK\x03\x04":
                    issue("format", "production USDZ must have a ZIP container signature")
        elif entry.get("role") == "model-usdz" and status == "ingest-draft":
            if entry.get("placeholder") is not True:
                issue(
                    "truthfulness",
                    "ingest-draft model-usdz must remain a placeholder until real USDZ exists",
                )
        elif entry.get("role") == "preview":
            if status == "ingest-draft" and entry.get("placeholder") is not False:
                issue("truthfulness", "ingest-draft preview cannot be a placeholder")
            with path.open("rb") as stream:
                if entry.get("mediaType") == "image/png" and stream.read(8) != b"\x89PNG\r\n\x1a\n":
                    issue("format", "PNG preview has an invalid signature")

    required_roles = {"model-gltf", "model-usdz", "preview"}
    if roles != required_roles or len(file_entries) != len(required_roles):
        issue("files", f"three file roles are required exactly once: {sorted(required_roles)}")

    if category in REQUIRED_ANCHORS:
        names = {
            item.get("name")
            for item in anchors.get("anchors", [])
            if isinstance(item, dict)
        }
        missing = REQUIRED_ANCHORS[category] - names
        if missing:
            issue("policy", f"missing {category} anchors: {sorted(missing)}")
        dimensions = product.get("dimensionsMm", {})
        if isinstance(dimensions, dict):
            largest = max(
                (value for value in dimensions.values() if isinstance(value, int | float)),
                default=0,
            )
            if largest > MAX_DIMENSION_MM[category]:
                issue("policy", f"{category} dimensions exceed plausible draft maximum")

    if glb_info is not None and category in MAX_GLB_BYTES:
        if glb_info.byte_length > MAX_GLB_BYTES[category]:
            issue("policy", f"GLB exceeds {category} byte budget")
        if glb_info.mesh_count < 1:
            issue("policy", "GLB must contain at least one mesh")
        if _triangle_count(glb_info) > MAX_TRIANGLES[category]:
            issue("policy", f"GLB exceeds {category} triangle budget")

    return ValidationReport(
        package=package_dir,
        package_id=package_id if isinstance(package_id, str) else None,
        category=category if isinstance(category, str) else None,
        issues=tuple(issues),
    )
