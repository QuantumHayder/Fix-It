from app.db.base import Base
from sqlalchemy import (
    Column, Integer, Text, ForeignKey, Table,
    UniqueConstraint, CheckConstraint,
)
from sqlalchemy.orm import relationship


# Association table: TestCase <-> Element (composite PK)
TestCaseElement = Table(
    "TestCaseElement",
    Base.metadata,
    Column("test_case_id", Integer, ForeignKey("TestCase.id"), primary_key=True),
    Column("element_id", Integer, ForeignKey("Element.id"), primary_key=True, index=True),
)


class TestCase(Base):
    __tablename__ = "TestCase"
    __test__ = False  # stop pytest from collecting this class
    __table_args__ = (
        UniqueConstraint("logical_case_id", "version_no", name="uq_testcase_logical_version"),
        CheckConstraint("version_no > 0", name="ck_testcase_version_positive"),
    )

    id = Column(Integer, primary_key=True, index=True)  # identifies this exact revision
    snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=False, index=True)
    logical_case_id = Column(Text, nullable=False, index=True)  # stable UUID across revisions
    version_no = Column(Integer, nullable=False)
    previous_version_id = Column(Integer, ForeignKey("TestCase.id"), nullable=True, index=True)
    purpose = Column(Text, nullable=False)
    steps = Column(Text, nullable=False)  # JSON as TEXT
    expected_result = Column(Text, nullable=False)
    gherkin_code = Column(Text, nullable=False, default="")  # empty before generation
    python_code = Column(Text, nullable=False, default="")  # empty before generation
    page_object_code = Column(Text, nullable=True)
    approved_at = Column(Text, nullable=True)  # case-plan approval timestamp
    created_at = Column(Text, nullable=False)  # UTC ISO 8601

    snapshot = relationship("Snapshot", back_populates="test_cases")
    previous_version = relationship("TestCase", remote_side=[id])
    elements = relationship(
        "Element", secondary=TestCaseElement, back_populates="test_cases"
    )
    results = relationship("TestResult", back_populates="test_case")