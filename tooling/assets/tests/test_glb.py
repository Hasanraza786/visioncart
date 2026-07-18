import struct
from collections.abc import Callable
from pathlib import Path

import pytest

from visioncart_assets.fixtures import tiny_triangle_glb
from visioncart_assets.glb import GlbError, parse_glb


def test_parse_structural_glb(tmp_path: Path) -> None:
    path = tmp_path / "triangle.glb"
    path.write_bytes(tiny_triangle_glb())
    info = parse_glb(path)
    assert info.chunk_types == ("JSON", "BIN")
    assert info.mesh_count == 1
    assert info.json["asset"]["version"] == "2.0"


@pytest.mark.parametrize(
    ("mutator", "message"),
    [
        (lambda value: b"BAD!" + value[4:], "magic"),
        (
            lambda value: value[:8] + struct.pack("<I", len(value) + 4) + value[12:],
            "file size",
        ),
        (lambda value: value[:10], "truncated"),
    ],
)
def test_rejects_malformed_glb(
    tmp_path: Path, mutator: Callable[[bytes], bytes], message: str
) -> None:
    path = tmp_path / "bad.glb"
    path.write_bytes(mutator(tiny_triangle_glb()))
    with pytest.raises(GlbError, match=message):
        parse_glb(path)
