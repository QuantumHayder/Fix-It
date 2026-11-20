import json
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.core.clock import utc_now_iso
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.integrations import runner_client
from app.models.element import Element
from app.models.snapshot import Snapshot
from app.models.user import User
from app.schemas.snapshot import InspectRequest, ScopeRequest
from app.services import website_service


def _same_site(url_a: str, url_b: str) -> bool:
    a, b = urlparse(url_a), urlparse(url_b)
    return a.scheme == b.scheme and a.netloc == b.netloc


def inspect_website(db: Session, user: User, website_id: int, data: InspectRequest) -> Snapshot:
    """Run the browser on the page and save everything it found as a new Snapshot."""
    website = website_service.get_website(db, user, website_id)

    page_url = data.page_url or website.url
    # only the approved testing target may be opened
    if not _same_site(page_url, website.url):
        raise AppError("The page must be on the same website (same scheme and host)")

    # If this page was inspected before, link to it. Maintenance compares the two later.
    previous = db.scalar(
        select(Snapshot)
        .where(Snapshot.website_id == website.id, Snapshot.page_url == page_url)
        .order_by(Snapshot.id.desc())
    )

    result, job_dir = runner_client.run_inspection(page_url)
    try:
        snapshot = Snapshot(
            website_id=website.id,
            previous_snapshot_id=previous.id if previous else None,
            page_url=page_url,
            captured_at=utc_now_iso(),
        )
        db.add(snapshot)
        db.flush()  # gives snapshot.id without committing yet

        snapshot.screenshot_path = storage.save_snapshot_screenshot(
            Path(job_dir) / "screenshot.png", snapshot.id
        )

        for item in result["elements"]:
            page_context = {
                "page_url": result["final_url"],
                "page_title": result["page_title"],
                "frame": "main",
                "index": item["index"],
                "text": item["text"],
                "label": item["label"],
                "form": item["form"],
                "disabled": item["disabled"],
                "has_click_handler": item["has_click_handler"],
                "bounding_box": item["bounding_box"],
            }
            db.add(Element(
                snapshot_id=snapshot.id,
                html_id=item["html_id"],
                name=item["name"],
                role=item["role"],
                tag_name=item["tag_name"],
                attributes=json.dumps(item["attributes"]),
                locator_candidates=json.dumps(item["locator_candidates"]),
                page_context=json.dumps(page_context),
            ))

        db.commit()
    finally:
        runner_client.cleanup_job(job_dir)

    db.refresh(snapshot)
    return snapshot


def list_snapshots(db: Session, user: User, website_id: int) -> list[Snapshot]:
    website = website_service.get_website(db, user, website_id)  # ownership check
    query = (
        select(Snapshot)
        .where(Snapshot.website_id == website.id)
        .order_by(Snapshot.id.desc())
    )
    return list(db.scalars(query))


def get_snapshot(db: Session, user: User, snapshot_id: int) -> Snapshot:
    snapshot = db.get(Snapshot, snapshot_id)
    # 404 for other users' snapshots too, same as websites
    if snapshot is None or snapshot.website.user_id != user.id:
        raise NotFoundError("Snapshot not found")
    return snapshot


def set_scope(db: Session, user: User, snapshot_id: int, data: ScopeRequest) -> Snapshot:
    """Save the tester's choice: test type, goal, picked elements, known requirements."""
    snapshot = get_snapshot(db, user, snapshot_id)

    # Test cases are grounded in this scope, so it can't change underneath them
    if snapshot.test_cases:
        raise ConflictError("Test cases already exist for this snapshot; start a new inspection instead")

    all_ids = [el.id for el in snapshot.elements]
    if data.select_all:
        selected_ids = all_ids
    else:
        unknown = [i for i in data.element_ids if i not in all_ids]
        if unknown:
            raise AppError(f"These elements are not part of this inspection: {unknown}")
        selected_ids = sorted(set(data.element_ids))

    requirements = [
        {"id": f"R{n}", "text": text} for n, text in enumerate(data.requirements, start=1)
    ]

    snapshot.test_type = data.test_type
    snapshot.test_goal = data.test_goal
    snapshot.selected_element_ids = json.dumps(selected_ids)
    snapshot.confirmed_requirements = json.dumps(requirements)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def get_screenshot_file(db: Session, user: User, snapshot_id: int) -> Path:
    snapshot = get_snapshot(db, user, snapshot_id)
    path = storage.get_artifact_file(snapshot.screenshot_path) if snapshot.screenshot_path else None
    if path is None:
        raise NotFoundError("This snapshot has no screenshot")
    return path
