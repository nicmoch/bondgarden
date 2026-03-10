import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.interactions import InteractionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/interactions", tags=["interactions"])


# ---------- Pydantic Schemas ----------
class InteractionsData(BaseModel):
    """Entity data schema (for create/update)"""
    journal_entry_id: int
    person_id: int
    sentiment: str
    intensity: int = None
    score: int = None
    personal_note: str = None
    is_ignored: bool = None
    created_at: Optional[datetime] = None


class InteractionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    journal_entry_id: Optional[int] = None
    person_id: Optional[int] = None
    sentiment: Optional[str] = None
    intensity: Optional[int] = None
    score: Optional[int] = None
    personal_note: Optional[str] = None
    is_ignored: Optional[bool] = None
    created_at: Optional[datetime] = None


class InteractionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    journal_entry_id: int
    person_id: int
    sentiment: str
    intensity: Optional[int] = None
    score: Optional[int] = None
    personal_note: Optional[str] = None
    is_ignored: Optional[bool] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InteractionsListResponse(BaseModel):
    """List response schema"""
    items: List[InteractionsResponse]
    total: int
    skip: int
    limit: int


class InteractionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[InteractionsData]


class InteractionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: InteractionsUpdateData


class InteractionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[InteractionsBatchUpdateItem]


class InteractionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=InteractionsListResponse)
async def query_interactionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query interactionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying interactionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = InteractionsService(db)
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
        logger.debug(f"Found {result['total']} interactionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying interactionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=InteractionsListResponse)
async def query_interactionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query interactionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying interactionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = InteractionsService(db)
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
        logger.debug(f"Found {result['total']} interactionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying interactionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=InteractionsResponse)
async def get_interactions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single interactions by ID (user can only see their own records)"""
    logger.debug(f"Fetching interactions with id: {id}, fields={fields}")
    
    service = InteractionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Interactions with id {id} not found")
            raise HTTPException(status_code=404, detail="Interactions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=InteractionsResponse, status_code=201)
async def create_interactions(
    data: InteractionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new interactions"""
    logger.debug(f"Creating new interactions with data: {data}")
    
    service = InteractionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create interactions")
        
        logger.info(f"Interactions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating interactions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating interactions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[InteractionsResponse], status_code=201)
async def create_interactionss_batch(
    request: InteractionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple interactionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} interactionss")
    
    service = InteractionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} interactionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[InteractionsResponse])
async def update_interactionss_batch(
    request: InteractionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple interactionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} interactionss")
    
    service = InteractionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} interactionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=InteractionsResponse)
async def update_interactions(
    id: int,
    data: InteractionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing interactions (requires ownership)"""
    logger.debug(f"Updating interactions {id} with data: {data}")

    service = InteractionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Interactions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Interactions not found")
        
        logger.info(f"Interactions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating interactions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating interactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_interactionss_batch(
    request: InteractionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple interactionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} interactionss")
    
    service = InteractionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} interactionss successfully")
        return {"message": f"Successfully deleted {deleted_count} interactionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_interactions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single interactions by ID (requires ownership)"""
    logger.debug(f"Deleting interactions with id: {id}")
    
    service = InteractionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Interactions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Interactions not found")
        
        logger.info(f"Interactions {id} deleted successfully")
        return {"message": "Interactions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting interactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
