from app.db.base import Base
from sqlalchemy import Column, Integer, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship


class TestRun(Base):
    __tablename__ = "TestRun"
    __test__ = False
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'running', 'completed', 'error', 'cancelled')",
            name="ck_testrun_status",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=False, index=True)
    status = Column(Text, nullable=False, default="queued")
    approved_by = Column(Integer, ForeignKey("User.id"), nullable=False, index=True)
    approved_at = Column(Text, nullable=False)  # approval for exact bundle
    created_at = Column(Text, nullable=False)
    started_at = Column(Text, nullable=True)
    finished_at = Column(Text, nullable=True)
    code_bundle_path = Column(Text, nullable=False)  # frozen runnable files incl. POM
    code_bundle_hash = Column(Text, nullable=False)  # hash of approved bundle
    report = Column(Text, nullable=True)  # JSON as TEXT

    snapshot = relationship("Snapshot", back_populates="test_runs")
    approver = relationship("User", back_populates="approved_runs")
    results = relationship("TestResult", back_populates="run")