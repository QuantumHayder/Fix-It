"""Shapes the model must answer in. The JSON schema is sent to Ollama so the
answer is forced into this format, and we validate it again with Pydantic."""
from pydantic import BaseModel


class ElementNote(BaseModel):
    element_id: int
    purpose: str  # what this element seems to do, based on what was observed


class NextAction(BaseModel):
    action: str  # e.g. "Fill Email and Password, then click Log in"
    element_ids: list[int]
    reason: str


class InspectionSummary(BaseModel):
    page_summary: str
    elements: list[ElementNote]
    suggested_actions: list[NextAction]
    # things the model could not know from the page; the tester must answer them
    questions_for_tester: list[str]
