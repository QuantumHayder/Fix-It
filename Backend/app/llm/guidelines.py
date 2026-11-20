"""Loads the short testing guidelines (markdown files) for a test type."""
import hashlib
from pathlib import Path

GUIDELINES_DIR = Path(__file__).resolve().parent / "guidelines"


def load_guidelines(test_type: str) -> tuple[str, str]:
    """Return (guideline text, version).

    The version is a short hash of the text, so if someone edits a guideline
    file we can still tell which version a snapshot was analysed with.
    """
    common = (GUIDELINES_DIR / "common.md").read_text(encoding="utf-8")
    specific_file = GUIDELINES_DIR / f"{test_type}.md"
    specific = specific_file.read_text(encoding="utf-8") if specific_file.exists() else ""

    text = f"{common}\n\n{specific}".strip()
    version = hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]
    return text, version
