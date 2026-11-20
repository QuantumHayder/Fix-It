"""Where artifacts (screenshots, later code bundles and traces) are kept on disk.

The database only stores paths relative to ARTIFACTS_DIR, e.g.
"snapshots/7/screenshot.png", so the folder can be moved or backed up.
"""
import shutil
from pathlib import Path

# Backend/artifacts
ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"


def save_snapshot_screenshot(source_file: Path, snapshot_id: int) -> str | None:
    """Copy the runner's screenshot into artifacts and return its relative path."""
    if not source_file.exists():
        return None
    relative_path = f"snapshots/{snapshot_id}/screenshot.png"
    target = ARTIFACTS_DIR / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_file, target)
    return relative_path


def get_artifact_file(relative_path: str) -> Path | None:
    """Turn a stored relative path back into a real file path (None if missing)."""
    path = (ARTIFACTS_DIR / relative_path).resolve()
    # never serve files outside the artifacts folder
    if ARTIFACTS_DIR.resolve() not in path.parents or not path.exists():
        return None
    return path
