from app.db.base import Base
from sqlalchemy import Column, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship


class Website(Base):
    __tablename__ = "Website"
    __table_args__ = (
        UniqueConstraint("user_id", "url", name="uq_website_user_url"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("User.id"), nullable=False, index=True)
    url = Column(Text, nullable=False)  # canonical, normalized URL
    display_name = Column(Text, nullable=True)
    created_at = Column(Text, nullable=False)  # UTC ISO 8601

    user = relationship("User", back_populates="websites")
    snapshots = relationship("Snapshot", back_populates="website")