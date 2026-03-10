from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Needs_catalog(Base):
    __tablename__ = "needs_catalog"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    is_default = Column(Boolean, nullable=True)
