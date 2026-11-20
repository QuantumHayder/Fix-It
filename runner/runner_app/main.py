"""Runner entry point. The backend starts it as a separate process:

    python -m runner_app.main <job_dir>/job.json

It reads the job, does the browser work, and writes <job_dir>/result.json.
The runner never touches the database, the backend saves everything.
"""
import json
import sys
from pathlib import Path

from runner_app.inspector import inspect_page
from runner_app.job_schema import validate_job


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python -m runner_app.main <job.json>", file=sys.stderr)
        return 2

    job_file = Path(sys.argv[1])
    job_dir = job_file.parent
    result_file = job_dir / "result.json"

    try:
        job = json.loads(job_file.read_text(encoding="utf-8"))
        validate_job(job)

        # only one job type for now; the executor will be added in phase 2
        result = inspect_page(
            url=job["url"],
            screenshot_path=job_dir / "screenshot.png",
            headless=job.get("headless", False),
            timeout_ms=job.get("timeout_ms", 30000),
        )
        result["ok"] = True
    except Exception as e:
        result = {"ok": False, "error": f"{type(e).__name__}: {e}"}

    result_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
