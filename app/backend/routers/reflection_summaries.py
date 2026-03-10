import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.reflection_summaries import Reflection_summariesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/reflection_summaries", tags=["reflection_summaries"])


# ---------- Pydantic Schemas ----------
class Reflection_summariesData(BaseModel):
    """Entity data schema (for create/update)"""
    reflection_type: str
    period_start: date
    period_end: date
    summary_text: str = None
    highlights: str = None
    created_at: Optional[datetime] = None


class Reflection_summariesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    reflection_type: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    summary_text: Optional[str] = None
    highlights: Optional[str] = None
    created_at: Optional[datetime] = None


class Reflection_summariesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    reflection_type: str
    period_start: date
    period_end: date
    summary_text: Optional[str] = None
    highlights: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Reflection_summariesListResponse(BaseModel):
    """List response schema"""
    items: List[Reflection_summariesResponse]
    total: int
    skip: int
    limit: int


class Reflection_summariesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Reflection_summariesData]


class Reflection_summariesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Reflection_summariesUpdateData


class Reflection_summariesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Reflection_summariesBatchUpdateItem]


class Reflection_summariesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Reflection_summariesListResponse)
async def query_reflection_summariess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query reflection_summariess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying reflection_summariess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Reflection_summariesService(db)
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
        logger.debug(f"Found {result['total']} reflection_summariess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying reflection_summariess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Reflection_summariesListResponse)
async def query_reflection_summariess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query reflection_summariess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying reflection_summariess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Reflection_summariesService(db)
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
        logger.debug(f"Found {result['total']} reflection_summariess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying reflection_summariess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Reflection_summariesResponse)
async def get_reflection_summaries(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single reflection_summaries by ID (user can only see their own records)"""
    logger.debug(f"Fetching reflection_summaries with id: {id}, fields={fields}")
    
    service = Reflection_summariesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Reflection_summaries with id {id} not found")
            raise HTTPException(status_code=404, detail="Reflection_summaries not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching reflection_summaries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Reflection_summariesResponse, status_code=201)
async def create_reflection_summaries(
    data: Reflection_summariesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new reflection_summaries"""
    logger.debug(f"Creating new reflection_summaries with data: {data}")
    
    service = Reflection_summariesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create reflection_summaries")
        
        logger.info(f"Reflection_summaries created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating reflection_summaries: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating reflection_summaries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Reflection_summariesResponse], status_code=201)
async def create_reflection_summariess_batch(
    request: Reflection_summariesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple reflection_summariess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} reflection_summariess")
    
    service = Reflection_summariesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} reflection_summariess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Reflection_summariesResponse])
async def update_reflection_summariess_batch(
    request: Reflection_summariesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple reflection_summariess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} reflection_summariess")
    
    service = Reflection_summariesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} reflection_summariess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Reflection_summariesResponse)
async def update_reflection_summaries(
    id: int,
    data: Reflection_summariesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing reflection_summaries (requires ownership)"""
    logger.debug(f"Updating reflection_summaries {id} with data: {data}")

    service = Reflection_summariesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Reflection_summaries with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Reflection_summaries not found")
        
        logger.info(f"Reflection_summaries {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating reflection_summaries {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating reflection_summaries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_reflection_summariess_batch(
    request: Reflection_summariesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple reflection_summariess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} reflection_summariess")
    
    service = Reflection_summariesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} reflection_summariess successfully")
        return {"message": f"Successfully deleted {deleted_count} reflection_summariess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_reflection_summaries(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single reflection_summaries by ID (requires ownership)"""
    logger.debug(f"Deleting reflection_summaries with id: {id}")
    
    service = Reflection_summariesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Reflection_summaries with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Reflection_summaries not found")
        
        logger.info(f"Reflection_summaries {id} deleted successfully")
        return {"message": "Reflection_summaries deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting reflection_summaries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
