from app.db.base import Base
from sqlalchemy import (
    Column, Integer, Text, ForeignKey,
    UniqueConstraint, CheckConstraint,
)
from sqlalchemy.orm import relationship


class ChatMessage(Base):
    __tablename__ = "ChatMessage"
    __table_args__ = (
        UniqueConstraint("snapshot_id", "sequence_no", name="uq_chatmessage_snapshot_seq"),
        CheckConstraint("role IN ('user', 'assistant')", name="ck_chatmessage_role"),
    )

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("Snapshot.id"), nullable=False, index=True)
    sequence_no = Column(Integer, nullable=False)  # stable ordering
    role = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    llm_call_id = Column(Integer, ForeignKey("LLMCall.id"), nullable=True, index=True)
    created_at = Column(Text, nullable=False)  # UTC ISO 8601

    snapshot = relationship("Snapshot", back_populates="chat_messages")
    llm_call = relationship("LLMCall", back_populates="chat_messages")