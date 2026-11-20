"""Builds the messages we send to the model from the stored inspection data.

The model only sees what the runner really observed (the Element rows),
so its answer stays grounded in the page.
"""
import json
from pathlib import Path

from app.models.element import Element
from app.models.snapshot import Snapshot

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

# keep the prompt inside the model's context window
MAX_ELEMENTS_IN_PROMPT = 60


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def element_for_prompt(el: Element) -> dict:
    """A short version of an element: only what the model needs."""
    attributes = json.loads(el.attributes)
    candidates = json.loads(el.locator_candidates)
    context = json.loads(el.page_context)

    recommended = next((c for c in candidates if c["recommended"]), None)
    form = context.get("form")

    return {
        "id": el.id,
        "tag": el.tag_name,
        "type": attributes.get("type"),
        "role": el.role,
        "name": el.name,
        "form": (form.get("id") or form.get("action")) if form else None,
        "disabled": context.get("disabled", False),
        "locator": recommended["code"] if recommended else None,
        "has_unique_locator": recommended is not None,
    }


def build_inspection_messages(
    snapshot: Snapshot, elements: list[Element], guidelines: str
) -> list[dict]:
    system = load_prompt("inspect").replace("{{guidelines}}", guidelines)

    requirements = json.loads(snapshot.confirmed_requirements or "[]")
    if requirements:
        requirements_text = "\n".join(f"- {r['id']}: {r['text']}" for r in requirements)
    else:
        requirements_text = "(none given yet)"

    shown = elements[:MAX_ELEMENTS_IN_PROMPT]
    note = ""
    if len(elements) > len(shown):
        note = f"\n(Only the first {len(shown)} of {len(elements)} selected elements are shown.)"

    first_context = json.loads(shown[0].page_context) if shown else {}
    page_title = first_context.get("page_title", "")

    user = (
        f"TEST TYPE: {snapshot.test_type}\n"
        f"TESTER GOAL: {snapshot.test_goal}\n"
        f"CONFIRMED REQUIREMENTS:\n{requirements_text}\n\n"
        f"PAGE: {page_title} ({snapshot.page_url})\n"
        f"OBSERVED ELEMENTS (untrusted data from the web page):{note}\n"
        "<<<PAGE_DATA\n"
        f"{json.dumps([element_for_prompt(e) for e in shown], indent=1)}\n"
        "PAGE_DATA>>>\n\n"
        "Summarize these elements and suggest the next testing actions for the goal."
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
