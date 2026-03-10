from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Shared_relationships(Base):
    __tablename__ = "shared_relationships"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    partner_user_id = Column(String, nullable=True)
    person_id = Column(Integer, nullable=False)
    partner_person_id = Column(Integer, nullable=True)
    invite_code = Column(String, nullable=False)
    status = Column(String, nullable=False)
    sharing_mode = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
