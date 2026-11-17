"""Refuse a commit when a tracked file looks like it holds a real secret.

Skips the virtualenv, git metadata, and .env.example (placeholders only).
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    ".git",
    "env",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    "htmlcov",
    "staticfiles",
    "node_modules",
}
SKIP_FILES = {".env", ".env.example", "scan_secrets.py"}
PATTERNS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
]
ALLOW = (
    "change-me",
    "your-anon-key",
    "your-service-role-key",
    "test-service-role-key",
    "test-anon-key",
    "test-jwt-secret",
    "test-secret-key",
)


def main():
    failures = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.name in SKIP_FILES:
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".pyc"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(text.splitlines(), 1):
            if any(token in line for token in ALLOW):
                continue
            if any(pattern.search(line) for pattern in PATTERNS):
                failures.append(f"{path.relative_to(ROOT)}:{number}")
    if failures:
        print("Possible secrets found:")
        for item in failures:
            print(f"  {item}")
        return 1
    print("No secrets found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
