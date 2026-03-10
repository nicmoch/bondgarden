from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Need_interaction_marks(Base):
    __tablename__ = "need_interaction_marks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    interaction_id = Column(Integer, nullable=False)
    person_need_id = Column(Integer, nullable=False)
    fulfillment = Column(String, nullable=False)
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
