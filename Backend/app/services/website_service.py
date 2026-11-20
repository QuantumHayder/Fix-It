from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import utc_now_iso
from app.core.exceptions import ConflictError, NotFoundError
from app.models.user import User
from app.models.website import Website
from app.schemas.website import WebsiteCreateRequest, WebsiteUpdateRequest


def create_website(db: Session, user: User, data: WebsiteCreateRequest) -> Website:
    # data.url is already normalized by the schema
    existing = db.scalar(
        select(Website.id).where(Website.user_id == user.id, Website.url == data.url)
    )
    if existing:
        raise ConflictError("You already added this website")

    website = Website(
        user_id=user.id,
        url=data.url,
        display_name=data.display_name,
        created_at=utc_now_iso(),
    )
    db.add(website)
    try:
        db.commit()
    except IntegrityError:
        # two requests passed the check above at the same time
        db.rollback()
        raise ConflictError("You already added this website")
    db.refresh(website)
    return website


def list_websites(db: Session, user: User) -> list[Website]:
    # newest first, for the dashboard sidebar
    query = (
        select(Website)
        .where(Website.user_id == user.id)
        .order_by(Website.created_at.desc())
    )
    return list(db.scalars(query))


def get_website(db: Session, user: User, website_id: int) -> Website:
    website = db.get(Website, website_id)
    # Return 404 for other users' websites too, so we don't reveal that they exist
    if website is None or website.user_id != user.id:
        raise NotFoundError("Website not found")
    return website


def update_website(
    db: Session, user: User, website_id: int, data: WebsiteUpdateRequest
) -> Website:
    website = get_website(db, user, website_id)
    website.display_name = data.display_name
    db.commit()
    db.refresh(website)
    return website
