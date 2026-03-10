from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Shared_notes(Base):
    __tablename__ = "shared_notes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    shared_relationship_id = Column(Integer, nullable=False)
    interaction_id = Column(Integer, nullable=True)
    note_text = Column(String, nullable=False)
    is_ai_suggested = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
