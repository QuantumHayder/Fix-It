from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.routers.dependencies import get_current_user
from app.schemas.website import (
    WebsiteCreateRequest,
    WebsiteResponse,
    WebsiteUpdateRequest,
)
from app.services import website_service

router = APIRouter(prefix="/websites", tags=["websites"])


@router.post("", response_model=WebsiteResponse, status_code=status.HTTP_201_CREATED)
def create_website(
    data: WebsiteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return website_service.create_website(db, current_user, data)


@router.get("", response_model=list[WebsiteResponse])
def list_websites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return website_service.list_websites(db, current_user)


@router.get("/{website_id}", response_model=WebsiteResponse)
def get_website(
    website_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return website_service.get_website(db, current_user, website_id)


@router.patch("/{website_id}", response_model=WebsiteResponse)
def update_website(
    website_id: int,
    data: WebsiteUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return website_service.update_website(db, current_user, website_id, data)
