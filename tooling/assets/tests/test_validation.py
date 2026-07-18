import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator  # type: ignore[import-untyped]

from visioncart_assets.fixtures import generate_all_fixtures, generate_fixture
from visioncart_assets.validation import (
    CATEGORIES,
    SCHEMA_ROOT,
    discover_packages,
    sha256_file,
    validate_package,
    validate_schema,
)


def test_schemas_are_valid_draft_2020_12() -> None:
    for path in sorted(SCHEMA_ROOT.glob("*.schema.json")):
        schema = json.loads(path.read_text())
        assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
        Draft202012Validator.check_schema(schema)


def test_all_four_schemas_accept_fixture_documents(tmp_path: Path) -> None:
    package = generate_fixture(tmp_path, "glasses")
    for name in ("package", "product", "anchors", "license"):
        document = json.loads((package / f"{name}.json").read_text())
        assert validate_schema(document, name) == []


def test_product_schema_rejects_unknown_category() -> None:
    document = {
        "schemaVersion": "1.0.0",
        "productId": "synthetic-shoe",
        "name": "Synthetic Shoe",
        "category": "shoe",
        "dimensionsMm": {"width": 1, "height": 1, "depth": 1},
        "synthetic": True,
    }
    assert validate_schema(document, "product")


def test_streaming_checksum_known_value(tmp_path: Path) -> None:
    value = tmp_path / "value.bin"
    value.write_bytes(b"abc")
    assert sha256_file(value, chunk_size=1) == (
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )


def test_five_category_fixtures_validate_and_are_discoverable(tmp_path: Path) -> None:
    packages = generate_all_fixtures(tmp_path)
    assert [path.parent.name for path in packages] == list(CATEGORIES)
    assert discover_packages(tmp_path) == sorted(packages)
    assert all(validate_package(path).valid for path in packages)


def test_fixture_generation_is_byte_deterministic(tmp_path: Path) -> None:
    first = generate_all_fixtures(tmp_path / "first")
    second = generate_all_fixtures(tmp_path / "second")
    for left, right in zip(first, second, strict=True):
        left_files = sorted(path.relative_to(left) for path in left.rglob("*") if path.is_file())
        right_files = sorted(path.relative_to(right) for path in right.rglob("*") if path.is_file())
        assert left_files == right_files
        assert all((left / path).read_bytes() == (right / path).read_bytes() for path in left_files)


def test_category_policy_requires_named_anchors(tmp_path: Path) -> None:
    package = generate_fixture(tmp_path, "watch")
    anchors_path = package / "anchors.json"
    anchors = json.loads(anchors_path.read_text())
    anchors["anchors"] = [anchors["anchors"][0]]
    anchors_path.write_text(json.dumps(anchors))
    report = validate_package(package)
    assert not report.valid
    assert any(issue.code == "policy" and "dial_center" in issue.message for issue in report.issues)


def test_checksum_tampering_is_detected(tmp_path: Path) -> None:
    package = generate_fixture(tmp_path, "ring")
    (package / "assets" / "preview.png").write_bytes(b"tampered")
    report = validate_package(package)
    assert {issue.code for issue in report.issues} >= {"checksum", "size"}


def test_synthetic_files_cannot_claim_production_candidate(tmp_path: Path) -> None:
    package = generate_fixture(tmp_path, "nose_pin")
    metadata_path = package / "package.json"
    metadata = json.loads(metadata_path.read_text())
    metadata["status"] = "production-candidate"
    metadata_path.write_text(json.dumps(metadata))
    report = validate_package(package)
    assert not report.valid
    assert {issue.code for issue in report.issues} >= {"truthfulness", "format"}


def test_generator_refuses_to_overwrite(tmp_path: Path) -> None:
    generate_fixture(tmp_path, "earring")
    with pytest.raises(FileExistsError):
        generate_fixture(tmp_path, "earring")
