import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.website import normalize_url

# Matches the guideline files in app/llm/guidelines/
TestType = Literal["smoke", "regression"]


def _parse_json(value):
    """JSON columns are stored as TEXT; turn them back into lists/dicts."""
    if isinstance(value, str):
        return json.loads(value)
    return value


# ---------- requests ----------

class InspectRequest(BaseModel):
    # Optional: inspect another page of the same website (e.g. /login).
    # If empty, the website's main URL is used.
    page_url: str | None = Field(default=None, max_length=2048)

    @field_validator("page_url")
    @classmethod
    def check_page_url(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return normalize_url(v)


class ScopeRequest(BaseModel):
    """What the tester wants to test, chosen from the inspected element list."""
    test_type: TestType
    test_goal: str = Field(min_length=3, max_length=2000)
    select_all: bool = False
    element_ids: list[int] = []
    # Expected behaviour the tester already knows, e.g. "Wrong password shows an error"
    requirements: list[str] = []

    @field_validator("test_goal")
    @classmethod
    def strip_goal(cls, v: str) -> str:
        return v.strip()

    @field_validator("requirements")
    @classmethod
    def clean_requirements(cls, v: list[str]) -> list[str]:
        return [r.strip() for r in v if r.strip()]

    @model_validator(mode="after")
    def check_selection(self):
        if not self.select_all and not self.element_ids:
            raise ValueError("Select at least one element, or use select_all")
        return self


# ---------- responses ----------

class ElementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    html_id: str | None
    name: str | None
    role: str | None
    tag_name: str
    attributes: dict
    locator_candidates: list[dict]
    page_context: dict

    @field_validator("attributes", "locator_candidates", "page_context", mode="before")
    @classmethod
    def parse_json_columns(cls, v):
        return _parse_json(v)


class SnapshotSummary(BaseModel):
    """Short version for the website history list."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    website_id: int
    previous_snapshot_id: int | None
    page_url: str
    test_type: str | None
    test_goal: str | None
    captured_at: str
    element_count: int
    has_screenshot: bool


class SnapshotDetail(SnapshotSummary):
    """Full inspection result: every element, plus the tester's selection."""
    selected_element_ids: list[int] | None
    confirmed_requirements: list[dict] | None
    elements: list[ElementResponse]

    @field_validator("selected_element_ids", "confirmed_requirements", mode="before")
    @classmethod
    def parse_json_columns(cls, v):
        return _parse_json(v)
