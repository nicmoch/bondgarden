from core.database import Base
from sqlalchemy import Column, Date, DateTime, Integer, String


class Journal_entries(Base):
    __tablename__ = "journal_entries"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    entry_date = Column(Date, nullable=False)
    content = Column(String, nullable=False)
    mood = Column(String, nullable=True)
    mood_score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
