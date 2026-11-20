from app.db.base import Base
from sqlalchemy import Column, Integer, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship


class LLMCall(Base):
    __tablename__ = "LLMCall"
    __table_args__ = (
        CheckConstraint(
            "purpose IN ('inspection', 'cases', 'code', 'revision', 'repair')",
            name="ck_llmcall_purpose",
        ),
        CheckConstraint(
            "token_count_source IN ('runtime', 'estimated', 'unavailable')",
            name="ck_llmcall_token_source",
        ),
        CheckConstraint(
            "status IN ('success', 'error', 'cancelled')",
            name="ck_llmcall_status",
        ),
        CheckConstraint("duration_ms >= 0", name="ck_llmcall_duration_nonneg"),
        CheckConstraint(
            "input_tokens IS NULL OR input_tokens >= 0",
            name="ck_llmcall_input_tokens_nonneg",
        ),
        CheckConstraint(
            "output_tokens IS NULL OR output_tokens >= 0",
            name="ck_llmcall_output_tokens_nonneg",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=False, index=True)
    model_name = Column(Text, nullable=False)
    model_version = Column(Text, nullable=False)  # digest/version
    purpose = Column(Text, nullable=False)
    input = Column(Text, nullable=False)
    output = Column(Text, nullable=True)
    timestamp = Column(Text, nullable=False)  # UTC ISO 8601
    duration_ms = Column(Integer, nullable=False)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    token_count_source = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)

    snapshot = relationship("Snapshot", back_populates="llm_calls")
    chat_messages = relationship("ChatMessage", back_populates="llm_call")