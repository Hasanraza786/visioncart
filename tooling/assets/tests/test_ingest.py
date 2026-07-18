import json
from pathlib import Path

from visioncart_assets.ingest import IngestSpec, build_ingest_package, solid_png
from visioncart_assets.validation import validate_package


def test_ingest_draft_package_validates(tmp_path: Path) -> None:
    glb = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "glasses"
        / "ingest-glasses-sun"
        / "assets"
        / "model.glb"
    )
    if not glb.is_file():
        # Fallback: copy from fixtures triangle is too synthetic; skip when packages absent.
        import pytest

        pytest.skip("ingest package GLB not present in workspace")

    package = build_ingest_package(
        tmp_path,
        IngestSpec(
            package_id="ingest-test-glasses",
            category="glasses",
            name="Test Glasses",
            source_note="Unit test ingest package",
            copyright="Test",
            source="test",
            glb=glb,
        ),
    )
    report = validate_package(package)
    assert report.valid, report.as_dict()
    metadata = json.loads((package / "package.json").read_text())
    assert metadata["status"] == "ingest-draft"
    assert metadata["files"][0]["placeholder"] is False
    assert metadata["files"][1]["placeholder"] is True


def test_solid_png_has_valid_signature() -> None:
    assert solid_png(8, 8, (10, 20, 30)).startswith(b"\x89PNG\r\n\x1a\n")
