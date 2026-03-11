import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.needs_catalog import Needs_catalog

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Needs_catalogService:
    """Service layer for Needs_catalog operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Needs_catalog]:
        """Create a new needs_catalog"""
        try:
            obj = Needs_catalog(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created needs_catalog with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating needs_catalog: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Needs_catalog]:
        """Get needs_catalog by ID"""
        try:
            query = select(Needs_catalog).where(Needs_catalog.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching needs_catalog {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of needs_catalogs"""
        try:
            query = select(Needs_catalog)
            count_query = select(func.count(Needs_catalog.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Needs_catalog, field):
                        query = query.where(getattr(Needs_catalog, field) == value)
                        count_query = count_query.where(getattr(Needs_catalog, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Needs_catalog, field_name):
                        query = query.order_by(getattr(Needs_catalog, field_name).desc())
                else:
                    if hasattr(Needs_catalog, sort):
                        query = query.order_by(getattr(Needs_catalog, sort))
            else:
                query = query.order_by(Needs_catalog.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching needs_catalog list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Needs_catalog]:
        """Update needs_catalog"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Needs_catalog {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated needs_catalog {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating needs_catalog {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete needs_catalog"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Needs_catalog {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted needs_catalog {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting needs_catalog {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Needs_catalog]:
        """Get needs_catalog by any field"""
        try:
            if not hasattr(Needs_catalog, field_name):
                raise ValueError(f"Field {field_name} does not exist on Needs_catalog")
            result = await self.db.execute(
                select(Needs_catalog).where(getattr(Needs_catalog, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching needs_catalog by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Needs_catalog]:
        """Get list of needs_catalogs filtered by field"""
        try:
            if not hasattr(Needs_catalog, field_name):
                raise ValueError(f"Field {field_name} does not exist on Needs_catalog")
            result = await self.db.execute(
                select(Needs_catalog)
                .where(getattr(Needs_catalog, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Needs_catalog.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching needs_catalogs by {field_name}: {str(e)}")
            raise
