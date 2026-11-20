from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_url(url: str) -> str:
    """Make the same site always look the same, so UNIQUE(user_id, url) works.

    Example: "  HTTPS://Example.com/login/ " -> "https://example.com/login"
    """
    url = url.strip()
    parsed = urlparse(url)

    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError("URL must start with http:// or https://")
    if not parsed.netloc:
        raise ValueError("URL must include a host, e.g. http://localhost:5000")

    scheme = parsed.scheme.lower()
    host = parsed.netloc.lower()
    path = parsed.path.rstrip("/")  # "/login/" and "/login" are the same page

    result = f"{scheme}://{host}{path}"
    if parsed.query:
        result += f"?{parsed.query}"
    # the #fragment is dropped on purpose, it does not change the page
    return result


class WebsiteCreateRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    display_name: str | None = Field(default=None, max_length=100)

    @field_validator("url")
    @classmethod
    def check_url(cls, v: str) -> str:
        return normalize_url(v)

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None  # treat "" as no name


class WebsiteUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class WebsiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    display_name: str | None
    created_at: str
