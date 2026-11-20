from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.routers.dependencies import get_current_user
from app.schemas.snapshot import (
    InspectRequest,
    ScopeRequest,
    SnapshotDetail,
    SnapshotSummary,
)
from app.services import inspection_service

router = APIRouter(tags=["snapshots"])


@router.post(
    "/websites/{website_id}/snapshots",
    response_model=SnapshotDetail,
    status_code=status.HTTP_201_CREATED,
)
def inspect_website(
    website_id: int,
    data: InspectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Opens a visible browser, so this request takes a few seconds
    return inspection_service.inspect_website(db, current_user, website_id, data)


@router.get("/websites/{website_id}/snapshots", response_model=list[SnapshotSummary])
def list_snapshots(
    website_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return inspection_service.list_snapshots(db, current_user, website_id)


@router.get("/snapshots/{snapshot_id}", response_model=SnapshotDetail)
def get_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return inspection_service.get_snapshot(db, current_user, snapshot_id)


@router.put("/snapshots/{snapshot_id}/scope", response_model=SnapshotDetail)
def set_scope(
    snapshot_id: int,
    data: ScopeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return inspection_service.set_scope(db, current_user, snapshot_id, data)


@router.get("/snapshots/{snapshot_id}/screenshot")
def get_screenshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = inspection_service.get_screenshot_file(db, current_user, snapshot_id)
    return FileResponse(path, media_type="image/png")
