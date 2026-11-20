import json

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.clock import utc_now_iso
from app.core.config import settings
from app.core.exceptions import AppError, LLMError, NotFoundError
from app.llm import client as llm_client
from app.llm.guidelines import load_guidelines
from app.llm.prompt_builder import build_inspection_messages
from app.llm.schemas import InspectionSummary
from app.models.llm_call import LLMCall
from app.models.user import User
from app.services import inspection_service


def record_call(
    db: Session,
    snapshot_id: int,
    model: dict,
    purpose: str,
    messages: list[dict],
    response: llm_client.LLMResponse,
) -> LLMCall:
    """Save every model call (also failed ones) for the usage/timing evidence."""
    call = LLMCall(
        snapshot_id=snapshot_id,
        model_name=model["name"],
        model_version=model["digest"],
        purpose=purpose,
        input=json.dumps(messages, indent=1),
        output=response.content,
        timestamp=utc_now_iso(),
        duration_ms=response.duration_ms,
        input_tokens=response.input_tokens,
        output_tokens=response.output_tokens,
        token_count_source=response.token_count_source,
        status=response.status,
        error_message=response.error_message,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def _check_grounding(summary: InspectionSummary, allowed_ids: set[int]) -> list[str]:
    """Remove any element id the model made up, and report it as a warning."""
    warnings = []

    kept_notes = []
    for note in summary.elements:
        if note.element_id in allowed_ids:
            kept_notes.append(note)
        else:
            warnings.append(f"Model described element {note.element_id}, which is not in the selection; removed.")
    summary.elements = kept_notes

    for action in summary.suggested_actions:
        unknown = [i for i in action.element_ids if i not in allowed_ids]
        if unknown:
            warnings.append(f"Action '{action.action}' used unknown elements {unknown}; removed them.")
            action.element_ids = [i for i in action.element_ids if i in allowed_ids]

    return warnings


def summarize_scope(db: Session, user: User, snapshot_id: int, model_name: str | None) -> dict:
    """Ask the model to summarize the selected elements and suggest next actions."""
    snapshot = inspection_service.get_snapshot(db, user, snapshot_id)
    if snapshot.selected_element_ids is None:
        raise AppError("Choose the elements, test type and goal first (PUT /snapshots/{id}/scope)")

    model = llm_client.get_model(model_name or settings.OLLAMA_MODEL)

    selected_ids = set(json.loads(snapshot.selected_element_ids))
    elements = [el for el in snapshot.elements if el.id in selected_ids]

    guidelines, guideline_version = load_guidelines(snapshot.test_type)
    snapshot.guideline_version = guideline_version

    messages = build_inspection_messages(snapshot, elements, guidelines)
    response = llm_client.chat(
        messages, model["name"], output_schema=InspectionSummary.model_json_schema()
    )

    # Validate the answer before trusting it
    summary = None
    if response.status == "success":
        try:
            summary = InspectionSummary.model_validate_json(response.content)
        except ValidationError:
            response.status = "error"
            response.error_message = "The model's answer did not match the expected JSON format"

    call = record_call(db, snapshot.id, model, "inspection", messages, response)

    if summary is None:
        raise LLMError(f"Model call failed: {call.error_message}")

    warnings = _check_grounding(summary, selected_ids)
    return {"summary": summary, "warnings": warnings, "call": call}


def get_usage(db: Session, user: User, snapshot_id: int) -> dict:
    snapshot = inspection_service.get_snapshot(db, user, snapshot_id)
    calls = sorted(snapshot.llm_calls, key=lambda c: c.id)

    # failed calls don't count in the average response time
    successful = [c for c in calls if c.status == "success"]
    average = None
    if successful:
        average = round(sum(c.duration_ms for c in successful) / len(successful))

    return {
        "call_count": len(calls),
        "successful_calls": len(successful),
        "average_duration_ms": average,
        "total_input_tokens": sum(c.input_tokens or 0 for c in calls),
        "total_output_tokens": sum(c.output_tokens or 0 for c in calls),
        "calls": calls,
    }


def get_call(db: Session, user: User, call_id: int) -> LLMCall:
    call = db.get(LLMCall, call_id)
    if call is None or call.snapshot.website.user_id != user.id:
        raise NotFoundError("Model call not found")
    return call
