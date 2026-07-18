import argparse
import json
from collections.abc import Sequence
from pathlib import Path

from .fixtures import generate_all_fixtures
from .glb import GlbError, parse_glb
from .ingest import build_default_mobile_packages
from .validation import discover_packages, load_json, sha256_file, validate_package


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="asset-cli",
        description="Validate and prepare VisionCart 3D asset packages.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="Inspect an asset package")
    inspect_parser.add_argument("package", type=Path)

    validate_parser = subparsers.add_parser("validate", help="Validate an asset package")
    validate_parser.add_argument("package", type=Path)

    checksum_parser = subparsers.add_parser("checksum", help="Stream a file SHA-256")
    checksum_parser.add_argument("file", type=Path)

    generate_parser = subparsers.add_parser(
        "generate-fixtures", help="Generate deterministic synthetic fixtures"
    )
    generate_parser.add_argument("output", type=Path)

    ingest_parser = subparsers.add_parser(
        "package-ingest",
        help="Build ingest-draft packages from optimized mobile GLBs",
    )
    ingest_parser.add_argument("optimized", type=Path, help="Directory with glasses/ring/watch.glb")
    ingest_parser.add_argument("output", type=Path, help="Packages root directory")
    ingest_parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing ingest packages",
    )

    report_parser = subparsers.add_parser("report", help="Report validation across a package tree")
    report_parser.add_argument("root", type=Path)

    for command in ("convert", "optimize"):
        adapter = subparsers.add_parser(
            command, help=f"Describe a {command} operation without executing it"
        )
        adapter.add_argument("source", type=Path)
        adapter.add_argument("output", type=Path)
        adapter.add_argument(
            "--dry-run",
            action="store_true",
            required=True,
            help="Required: Phase 1 adapters cannot execute production processing",
        )

    return parser


def _print(value: object) -> None:
    print(json.dumps(value, indent=2, sort_keys=True))


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "checksum":
        if not args.file.is_file():
            raise SystemExit(f"File does not exist: {args.file}")
        print(sha256_file(args.file))
        return 0

    if args.command == "generate-fixtures":
        generated = generate_all_fixtures(args.output)
        _print({"generated": [str(path) for path in generated], "status": "synthetic-draft"})
        return 0

    if args.command == "package-ingest":
        generated = build_default_mobile_packages(
            args.optimized,
            args.output,
            overwrite=args.overwrite,
        )
        _print(
            {
                "generated": [str(path) for path in generated],
                "status": "ingest-draft",
            }
        )
        return 0

    if args.command in {"convert", "optimize"}:
        _print(
            {
                "command": args.command,
                "dryRun": True,
                "executed": False,
                "output": str(args.output),
                "source": str(args.source),
                "warning": "Phase 1 adapter only; no conversion or optimization was performed.",
            }
        )
        return 0

    target: Path = args.package if args.command in {"inspect", "validate"} else args.root
    if not target.exists():
        raise SystemExit(f"Path does not exist: {target}")

    if args.command == "inspect":
        package_dir = target if target.is_dir() else target.parent
        metadata = load_json(package_dir / "package.json")
        glbs = [
            package_dir / item["path"]
            for item in metadata.get("files", [])
            if isinstance(item, dict) and item.get("role") == "model-gltf"
        ]
        result: dict[str, object] = {
            "category": metadata.get("category"),
            "package": str(package_dir.resolve()),
            "packageId": metadata.get("packageId"),
            "status": metadata.get("status"),
        }
        if glbs:
            try:
                info = parse_glb(glbs[0])
                result["glb"] = {
                    "bytes": info.byte_length,
                    "chunks": info.chunk_types,
                    "meshes": info.mesh_count,
                }
            except GlbError as error:
                result["glbError"] = str(error)
        _print(result)
        return 0

    package_dirs = (
        [target if target.is_dir() else target.parent]
        if args.command == "validate"
        else discover_packages(target)
    )
    reports = [validate_package(path) for path in package_dirs]
    if args.command == "validate":
        _print(reports[0].as_dict())
    else:
        _print(
            {
                "invalid": sum(not report.valid for report in reports),
                "packages": [report.as_dict() for report in reports],
                "total": len(reports),
                "valid": sum(report.valid for report in reports),
            }
        )
    return 0 if reports and all(report.valid for report in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())
