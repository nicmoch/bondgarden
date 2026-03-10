from core.database import Base
from sqlalchemy import Column, Date, DateTime, Integer, String


class Reflection_summaries(Base):
    __tablename__ = "reflection_summaries"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    reflection_type = Column(String, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    summary_text = Column(String, nullable=True)
    highlights = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
