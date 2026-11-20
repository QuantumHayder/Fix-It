from app.db.base import Base
from sqlalchemy import Column, Integer, Text
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = 'User'
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(Text)
    last_name=Column(Text)
    username=Column(Text, nullable=False, unique=True)
    email=Column(Text, nullable=False, unique=True)
    pw_hash=Column(Text, nullable=False)
    joined_at=Column(Text, nullable=False)
    
    websites = relationship("Website", back_populates="user")
    approved_runs = relationship("TestRun", back_populates="approver")