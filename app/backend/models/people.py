from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class People(Base):
    __tablename__ = "people"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    relationship_type = Column(String, nullable=True)
    avatar_emoji = Column(String, nullable=True)
    is_given_garden = Column(Boolean, nullable=True)
    is_archived = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
