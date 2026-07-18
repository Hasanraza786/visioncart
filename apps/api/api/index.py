"""Vercel Python (ASGI) entrypoint.

Vercel's Python runtime serves the module-level ``app`` ASGI application.
This shim ensures the ``src`` layout is importable when deployed.
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from visioncart_api.main import app  # noqa: E402

__all__ = ["app"]
