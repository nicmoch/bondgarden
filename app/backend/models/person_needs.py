from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Person_needs(Base):
    __tablename__ = "person_needs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    person_id = Column(Integer, nullable=False)
    need_id = Column(Integer, nullable=True)
    custom_need_name = Column(String, nullable=True)
    priority = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
