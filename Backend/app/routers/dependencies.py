from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.services import auth_service

# auto_error=False so a missing header goes through our own 401 handling
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AuthenticationError("Not authenticated")

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise AuthenticationError("Invalid or expired token")

    user = auth_service.get_user_by_id(db, user_id)
    if user is None:
        # valid token for an account that no longer exists
        raise AuthenticationError("Invalid or expired token")
    return user