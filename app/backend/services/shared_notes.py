import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.shared_notes import Shared_notes

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Shared_notesService:
    """Service layer for Shared_notes operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Shared_notes]:
        """Create a new shared_notes"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Shared_notes(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created shared_notes with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating shared_notes: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for shared_notes {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Shared_notes]:
        """Get shared_notes by ID (user can only see their own records)"""
        try:
            query = select(Shared_notes).where(Shared_notes.id == obj_id)
            if user_id:
                query = query.where(Shared_notes.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching shared_notes {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of shared_notess (user can only see their own records)"""
        try:
            query = select(Shared_notes)
            count_query = select(func.count(Shared_notes.id))
            
            if user_id:
                query = query.where(Shared_notes.user_id == user_id)
                count_query = count_query.where(Shared_notes.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Shared_notes, field):
                        query = query.where(getattr(Shared_notes, field) == value)
                        count_query = count_query.where(getattr(Shared_notes, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Shared_notes, field_name):
                        query = query.order_by(getattr(Shared_notes, field_name).desc())
                else:
                    if hasattr(Shared_notes, sort):
                        query = query.order_by(getattr(Shared_notes, sort))
            else:
                query = query.order_by(Shared_notes.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching shared_notes list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Shared_notes]:
        """Update shared_notes (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Shared_notes {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated shared_notes {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating shared_notes {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete shared_notes (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Shared_notes {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted shared_notes {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting shared_notes {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Shared_notes]:
        """Get shared_notes by any field"""
        try:
            if not hasattr(Shared_notes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Shared_notes")
            result = await self.db.execute(
                select(Shared_notes).where(getattr(Shared_notes, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching shared_notes by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Shared_notes]:
        """Get list of shared_notess filtered by field"""
        try:
            if not hasattr(Shared_notes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Shared_notes")
            result = await self.db.execute(
                select(Shared_notes)
                .where(getattr(Shared_notes, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Shared_notes.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching shared_notess by {field_name}: {str(e)}")
            raise
