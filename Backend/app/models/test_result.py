from app.db.base import Base
from sqlalchemy import (
    Column, Integer, Text, ForeignKey,
    UniqueConstraint, CheckConstraint,
)
from sqlalchemy.orm import relationship


class TestResult(Base):
    __tablename__ = "TestResult"
    __test__ = False
    __table_args__ = (
        UniqueConstraint("run_id", "test_case_id", name="uq_testresult_run_case"),
        CheckConstraint(
            "status IN ('pending', 'running', 'passed', 'failed', 'skipped', 'error', 'cancelled')",
            name="ck_testresult_status",
        ),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_testresult_duration_nonneg",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("TestRun.id"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("TestCase.id"), nullable=False, index=True)  # exact revision
    status = Column(Text, nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    screenshot_path = Column(Text, nullable=True)
    trace_path = Column(Text, nullable=True)

    run = relationship("TestRun", back_populates="results")
    test_case = relationship("TestCase", back_populates="results")