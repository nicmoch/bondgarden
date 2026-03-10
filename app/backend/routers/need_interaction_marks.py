import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.need_interaction_marks import Need_interaction_marksService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/need_interaction_marks", tags=["need_interaction_marks"])


# ---------- Pydantic Schemas ----------
class Need_interaction_marksData(BaseModel):
    """Entity data schema (for create/update)"""
    interaction_id: int
    person_need_id: int
    fulfillment: str
    score: int = None
    created_at: Optional[datetime] = None


class Need_interaction_marksUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    interaction_id: Optional[int] = None
    person_need_id: Optional[int] = None
    fulfillment: Optional[str] = None
    score: Optional[int] = None
    created_at: Optional[datetime] = None


class Need_interaction_marksResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    interaction_id: int
    person_need_id: int
    fulfillment: str
    score: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Need_interaction_marksListResponse(BaseModel):
    """List response schema"""
    items: List[Need_interaction_marksResponse]
    total: int
    skip: int
    limit: int


class Need_interaction_marksBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Need_interaction_marksData]


class Need_interaction_marksBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Need_interaction_marksUpdateData


class Need_interaction_marksBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Need_interaction_marksBatchUpdateItem]


class Need_interaction_marksBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Need_interaction_marksListResponse)
async def query_need_interaction_markss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query need_interaction_markss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying need_interaction_markss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Need_interaction_marksService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} need_interaction_markss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying need_interaction_markss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Need_interaction_marksListResponse)
async def query_need_interaction_markss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query need_interaction_markss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying need_interaction_markss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Need_interaction_marksService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} need_interaction_markss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying need_interaction_markss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Need_interaction_marksResponse)
async def get_need_interaction_marks(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single need_interaction_marks by ID (user can only see their own records)"""
    logger.debug(f"Fetching need_interaction_marks with id: {id}, fields={fields}")
    
    service = Need_interaction_marksService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Need_interaction_marks with id {id} not found")
            raise HTTPException(status_code=404, detail="Need_interaction_marks not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching need_interaction_marks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Need_interaction_marksResponse, status_code=201)
async def create_need_interaction_marks(
    data: Need_interaction_marksData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new need_interaction_marks"""
    logger.debug(f"Creating new need_interaction_marks with data: {data}")
    
    service = Need_interaction_marksService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create need_interaction_marks")
        
        logger.info(f"Need_interaction_marks created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating need_interaction_marks: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating need_interaction_marks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Need_interaction_marksResponse], status_code=201)
async def create_need_interaction_markss_batch(
    request: Need_interaction_marksBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple need_interaction_markss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} need_interaction_markss")
    
    service = Need_interaction_marksService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} need_interaction_markss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Need_interaction_marksResponse])
async def update_need_interaction_markss_batch(
    request: Need_interaction_marksBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple need_interaction_markss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} need_interaction_markss")
    
    service = Need_interaction_marksService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} need_interaction_markss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Need_interaction_marksResponse)
async def update_need_interaction_marks(
    id: int,
    data: Need_interaction_marksUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing need_interaction_marks (requires ownership)"""
    logger.debug(f"Updating need_interaction_marks {id} with data: {data}")

    service = Need_interaction_marksService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Need_interaction_marks with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Need_interaction_marks not found")
        
        logger.info(f"Need_interaction_marks {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating need_interaction_marks {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating need_interaction_marks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_need_interaction_markss_batch(
    request: Need_interaction_marksBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple need_interaction_markss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} need_interaction_markss")
    
    service = Need_interaction_marksService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} need_interaction_markss successfully")
        return {"message": f"Successfully deleted {deleted_count} need_interaction_markss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_need_interaction_marks(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single need_interaction_marks by ID (requires ownership)"""
    logger.debug(f"Deleting need_interaction_marks with id: {id}")
    
    service = Need_interaction_marksService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Need_interaction_marks with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Need_interaction_marks not found")
        
        logger.info(f"Need_interaction_marks {id} deleted successfully")
        return {"message": "Need_interaction_marks deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting need_interaction_marks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
