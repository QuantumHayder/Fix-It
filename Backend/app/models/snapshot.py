from app.db.base import Base
from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship


class Snapshot(Base):
    __tablename__ = "Snapshot"

    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("Website.id"), nullable=False, index=True)
    previous_snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=True, index=True)
    page_url = Column(Text, nullable=False)
    # These three are filled in after inspection, when the tester picks the scope and goal
    test_type = Column(Text, nullable=True)
    test_goal = Column(Text, nullable=True)
    confirmed_requirements = Column(Text, nullable=True)  # JSON as TEXT
    selected_element_ids = Column(Text, nullable=True)  # JSON list of Element ids the tester picked
    guideline_version = Column(Text, nullable=True)
    captured_at = Column(Text, nullable=False)  # UTC ISO 8601
    screenshot_path = Column(Text, nullable=True)  # relative to Backend/artifacts

    website = relationship("Website", back_populates="snapshots")
    previous_snapshot = relationship("Snapshot", remote_side=[id])
    elements = relationship("Element", back_populates="snapshot")
    test_cases = relationship("TestCase", back_populates="snapshot")
    test_runs = relationship("TestRun", back_populates="snapshot")
    llm_calls = relationship("LLMCall", back_populates="snapshot")
    chat_messages = relationship("ChatMessage", back_populates="snapshot")

    # Small helpers used by the API responses
    @property
    def element_count(self) -> int:
        return len(self.elements)

    @property
    def has_screenshot(self) -> bool:
        return self.screenshot_path is not None