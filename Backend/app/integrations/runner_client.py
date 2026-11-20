"""Talks to the runner. The runner is a separate Python process, so a crash or
a bad page never takes down the backend.

Flow: write job.json -> start `python -m runner_app.main job.json` -> wait ->
read result.json. Each job gets its own folder in runner/jobs/.
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.exceptions import ConflictError, RunnerError

# Project/runner (Backend/app/integrations/runner_client.py -> up 3 folders)
RUNNER_DIR = Path(__file__).resolve().parents[3] / "runner"
JOBS_DIR = RUNNER_DIR / "jobs"

# The design allows only one browser job at a time
_browser_lock = threading.Lock()


def _runner_env() -> dict:
    """Environment for the runner process, without the backend's secrets."""
    env = dict(os.environ)
    for secret in ("JWT_SECRET", "SQLALCHEMY_DATABASE_URL"):
        env.pop(secret, None)
    return env


def run_inspection(url: str) -> tuple[dict, Path]:
    """Inspect a page. Returns (result dict, job folder).

    The caller must call cleanup_job(job_dir) after copying what it needs
    (the screenshot) out of the job folder.
    """
    if not _browser_lock.acquire(blocking=False):
        raise ConflictError("Another browser job is already running, try again when it finishes")

    try:
        job_dir = JOBS_DIR / uuid.uuid4().hex
        job_dir.mkdir(parents=True)
        job_file = job_dir / "job.json"
        job = {
            "type": "inspect",
            "url": url,
            "headless": settings.RUNNER_HEADLESS,
            "timeout_ms": 30000,
        }
        job_file.write_text(json.dumps(job), encoding="utf-8")

        python = settings.RUNNER_PYTHON or sys.executable
        try:
            process = subprocess.run(
                [python, "-m", "runner_app.main", str(job_file)],
                cwd=RUNNER_DIR,
                env=_runner_env(),
                capture_output=True,
                text=True,
                timeout=settings.INSPECTION_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            cleanup_job(job_dir)
            raise RunnerError("Inspection took too long and was stopped")

        result_file = job_dir / "result.json"
        if not result_file.exists():
            # the runner crashed before writing a result (e.g. playwright not installed)
            cleanup_job(job_dir)
            details = (process.stderr or "").strip().splitlines()[-1:] or ["no output"]
            raise RunnerError(f"Runner failed: {details[0]}")

        result = json.loads(result_file.read_text(encoding="utf-8"))
        if not result.get("ok"):
            cleanup_job(job_dir)
            raise RunnerError(f"Inspection failed: {result.get('error')}")

        return result, job_dir
    finally:
        _browser_lock.release()


def cleanup_job(job_dir: Path) -> None:
    shutil.rmtree(job_dir, ignore_errors=True)
