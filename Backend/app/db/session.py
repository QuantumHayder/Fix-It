from sqlalchemy.orm import sessionmaker
from app.db.base import engine

SessionLocal = sessionmaker(autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()