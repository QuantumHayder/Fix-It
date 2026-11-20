from app.db.base import Base
from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship


class Element(Base):
    __tablename__ = "Element"

    # Application-generated identifier, scoped through Snapshot
    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=False, index=True)
    html_id = Column(Text, nullable=True)
    name = Column(Text, nullable=True)
    role = Column(Text, nullable=True)
    tag_name = Column(Text, nullable=False)
    attributes = Column(Text, nullable=False)  # JSON as TEXT; omit sensitive values
    locator_candidates = Column(Text, nullable=False)  # JSON as TEXT
    page_context = Column(Text, nullable=False)  # JSON as TEXT

    snapshot = relationship("Snapshot", back_populates="elements")
    test_cases = relationship(
        "TestCase", secondary="TestCaseElement", back_populates="elements"
    )