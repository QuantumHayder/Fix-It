from datetime import datetime, timezone


def utc_now_iso() -> str:
    """UTC timestamp as ISO 8601 text, matching the TEXT timestamp columns."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")