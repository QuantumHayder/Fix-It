from app.db.base import Base
from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship


class Snapshot(Base):
    __tablename__ = "Snapshot"

    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("Website.id"), nullable=False, index=True)
    previous_snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=True, index=True)
    page_url = Column(Text, nullable=False)
    test_type = Column(Text, nullable=False)
    test_goal = Column(Text, nullable=False)
    confirmed_requirements = Column(Text, nullable=False)  # JSON as TEXT
    guideline_version = Column(Text, nullable=True)
    captured_at = Column(Text, nullable=False)  # UTC ISO 8601
    screenshot_path = Column(Text, nullable=True)

    website = relationship("Website", back_populates="snapshots")
    previous_snapshot = relationship("Snapshot", remote_side=[id])
    elements = relationship("Element", back_populates="snapshot")
    test_cases = relationship("TestCase", back_populates="snapshot")
    test_runs = relationship("TestRun", back_populates="snapshot")
    llm_calls = relationship("LLMCall", back_populates="snapshot")
    chat_messages = relationship("ChatMessage", back_populates="snapshot")