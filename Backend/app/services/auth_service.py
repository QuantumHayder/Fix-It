from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import utc_now_iso
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

# Verified against when the user doesn't exist, so login timing doesn't reveal valid accounts
_DUMMY_HASH = hash_password("not-a-real-password")


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def register_user(db: Session, data: RegisterRequest) -> User:
    # data.username and data.email are already normalized by the schema
    if db.scalar(select(User.id).where(User.username == data.username)):
        raise ConflictError("Username is already taken")
    if db.scalar(select(User.id).where(User.email == data.email)):
        raise ConflictError("Email is already registered")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        username=data.username,
        email=data.email,
        pw_hash=hash_password(data.password),
        joined_at=utc_now_iso(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two requests passed the checks above at the same time; the UNIQUE constraint caught it
        db.rollback()
        raise ConflictError("Username or email is already registered")
    db.refresh(user)
    return user


def login_user(db: Session, data: LoginRequest) -> TokenResponse:
    identifier = data.identifier.strip().lower()
    column = User.email if "@" in identifier else User.username
    user = db.scalar(select(User).where(column == identifier))

    password_hash = user.pw_hash if user else _DUMMY_HASH
    password_ok = verify_password(data.password, password_hash)

    if user is None or not password_ok:
        raise AuthenticationError("Invalid username/email or password")

    return TokenResponse(access_token=create_access_token(user.id))