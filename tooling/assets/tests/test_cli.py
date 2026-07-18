import json
from pathlib import Path

import pytest

from visioncart_assets.cli import main
from visioncart_assets.fixtures import generate_fixture


def test_inspect_validate_checksum_and_report(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    package = generate_fixture(tmp_path / "fixtures", "ring")

    assert main(["inspect", str(package)]) == 0
    inspected = json.loads(capsys.readouterr().out)
    assert inspected["status"] == "synthetic-draft"
    assert inspected["glb"]["meshes"] == 1

    assert main(["validate", str(package)]) == 0
    validated = json.loads(capsys.readouterr().out)
    assert validated["valid"] is True

    model = package / "assets" / "model.glb"
    assert main(["checksum", str(model)]) == 0
    assert len(capsys.readouterr().out.strip()) == 64

    assert main(["report", str(tmp_path / "fixtures")]) == 0
    report = json.loads(capsys.readouterr().out)
    assert report["valid"] == 1


def test_generate_fixtures_cli(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["generate-fixtures", str(tmp_path / "generated")]) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["status"] == "synthetic-draft"
    assert len(result["generated"]) == 5


def test_adapters_are_truthful_dry_runs(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    output = tmp_path / "would-be-output.glb"
    assert main(["convert", "source.fbx", str(output), "--dry-run"]) == 0
    converted = json.loads(capsys.readouterr().out)
    assert converted["executed"] is False
    assert not output.exists()

    assert main(["optimize", "source.glb", str(output), "--dry-run"]) == 0
    optimized = json.loads(capsys.readouterr().out)
    assert optimized["executed"] is False
    assert not output.exists()
