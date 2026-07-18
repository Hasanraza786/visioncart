"""Small, dependency-free structural GLB 2.0 parser."""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Any

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


class GlbError(ValueError):
    """Raised when a GLB is structurally invalid."""


@dataclass(frozen=True)
class GlbInfo:
    path: Path
    byte_length: int
    chunk_types: tuple[str, ...]
    json: dict[str, Any]

    @property
    def mesh_count(self) -> int:
        meshes = self.json.get("meshes", [])
        return len(meshes) if isinstance(meshes, list) else 0


def parse_glb(path: Path) -> GlbInfo:
    """Parse GLB framing and JSON without loading buffer payloads into memory."""
    file_size = path.stat().st_size
    with path.open("rb") as stream:
        header = stream.read(12)
        if len(header) != 12:
            raise GlbError("GLB header is truncated")
        magic, version, declared_length = struct.unpack("<4sII", header)
        if magic != b"glTF":
            raise GlbError("invalid GLB magic")
        if version != 2:
            raise GlbError(f"unsupported GLB version: {version}")
        if declared_length != file_size:
            raise GlbError(
                f"declared GLB length {declared_length} does not match file size {file_size}"
            )

        chunks: list[str] = []
        document: dict[str, Any] | None = None
        consumed = 12
        while consumed < file_size:
            chunk_header = stream.read(8)
            if len(chunk_header) != 8:
                raise GlbError("GLB chunk header is truncated")
            chunk_length, chunk_type = struct.unpack("<II", chunk_header)
            consumed += 8
            if chunk_length % 4:
                raise GlbError("GLB chunk length is not four-byte aligned")
            if consumed + chunk_length > file_size:
                raise GlbError("GLB chunk exceeds declared file length")

            if chunk_type == JSON_CHUNK:
                if chunks or document is not None:
                    raise GlbError("JSON must be the first and only JSON chunk")
                payload = stream.read(chunk_length)
                try:
                    parsed = json.loads(payload.rstrip(b" \x00").decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError) as error:
                    raise GlbError(f"invalid GLB JSON: {error}") from error
                if not isinstance(parsed, dict):
                    raise GlbError("GLB JSON root must be an object")
                document = parsed
                chunks.append("JSON")
            elif chunk_type == BIN_CHUNK:
                if document is None:
                    raise GlbError("BIN chunk cannot precede JSON")
                stream.seek(chunk_length, 1)
                chunks.append("BIN")
            else:
                stream.seek(chunk_length, 1)
                chunks.append(f"0x{chunk_type:08x}")
            consumed += chunk_length

        if document is None:
            raise GlbError("GLB has no JSON chunk")
        asset = document.get("asset")
        if not isinstance(asset, dict) or asset.get("version") != "2.0":
            raise GlbError("GLB JSON must declare asset.version 2.0")
        return GlbInfo(path, file_size, tuple(chunks), document)
