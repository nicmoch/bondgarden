from core.database import Base
from sqlalchemy import Column, Date, DateTime, Float, Integer, String


class Relationship_scores(Base):
    __tablename__ = "relationship_scores"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    person_id = Column(Integer, nullable=False)
    balance_score = Column(Float, nullable=True)
    health_score = Column(Float, nullable=True)
    needs_score = Column(Float, nullable=True)
    trend = Column(String, nullable=True)
    last_interaction_date = Column(Date, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
