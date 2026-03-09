from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Interactions(Base):
    __tablename__ = "interactions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    journal_entry_id = Column(Integer, nullable=False)
    person_id = Column(Integer, nullable=False)
    sentiment = Column(String, nullable=False)
    intensity = Column(Integer, nullable=True)
    score = Column(Integer, nullable=True)
    personal_note = Column(String, nullable=True)
    is_ignored = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
