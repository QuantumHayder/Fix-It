"""The runner only accepts a few fixed job types. Anything else is rejected.

A job is a small JSON file written by the backend, for example:
{
    "type": "inspect",
    "url": "http://localhost:5000/login",
    "headless": false,
    "timeout_ms": 30000
}
"""
from urllib.parse import urlparse

ALLOWED_JOB_TYPES = ("inspect",)


def validate_job(job: dict) -> None:
    """Raise ValueError if the job is not something the runner is allowed to do."""
    if job.get("type") not in ALLOWED_JOB_TYPES:
        raise ValueError(f"Unknown job type: {job.get('type')}")

    url = job.get("url")
    if not isinstance(url, str):
        raise ValueError("Job is missing the url")

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Job url must be an http(s) URL")

    timeout_ms = job.get("timeout_ms", 30000)
    if not isinstance(timeout_ms, int) or timeout_ms <= 0 or timeout_ms > 120000:
        raise ValueError("timeout_ms must be between 1 and 120000")
