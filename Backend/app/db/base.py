from app.core.config import settings
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base


db_url = settings.SQLALCHEMY_DATABASE_URL
if not db_url:
    raise ValueError("SQLALCHEMY_DATABASE_URL is missing from the .env file")

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
engine = create_engine(db_url, connect_args=connect_args)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    # SQLite ignores FK constraints unless this is set on every connection
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


Base = declarative_base()