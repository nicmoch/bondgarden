import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.shared_notes import Shared_notesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/shared_notes", tags=["shared_notes"])


# ---------- Pydantic Schemas ----------
class Shared_notesData(BaseModel):
    """Entity data schema (for create/update)"""
    shared_relationship_id: int
    interaction_id: int = None
    note_text: str
    is_ai_suggested: bool = None
    created_at: Optional[datetime] = None


class Shared_notesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    shared_relationship_id: Optional[int] = None
    interaction_id: Optional[int] = None
    note_text: Optional[str] = None
    is_ai_suggested: Optional[bool] = None
    created_at: Optional[datetime] = None


class Shared_notesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    shared_relationship_id: int
    interaction_id: Optional[int] = None
    note_text: str
    is_ai_suggested: Optional[bool] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Shared_notesListResponse(BaseModel):
    """List response schema"""
    items: List[Shared_notesResponse]
    total: int
    skip: int
    limit: int


class Shared_notesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Shared_notesData]


class Shared_notesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Shared_notesUpdateData


class Shared_notesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Shared_notesBatchUpdateItem]


class Shared_notesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Shared_notesListResponse)
async def query_shared_notess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query shared_notess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying shared_notess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Shared_notesService(db)
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
        logger.debug(f"Found {result['total']} shared_notess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shared_notess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Shared_notesListResponse)
async def query_shared_notess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query shared_notess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying shared_notess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Shared_notesService(db)
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
        logger.debug(f"Found {result['total']} shared_notess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shared_notess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Shared_notesResponse)
async def get_shared_notes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single shared_notes by ID (user can only see their own records)"""
    logger.debug(f"Fetching shared_notes with id: {id}, fields={fields}")
    
    service = Shared_notesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shared_notes with id {id} not found")
            raise HTTPException(status_code=404, detail="Shared_notes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shared_notes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Shared_notesResponse, status_code=201)
async def create_shared_notes(
    data: Shared_notesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new shared_notes"""
    logger.debug(f"Creating new shared_notes with data: {data}")
    
    service = Shared_notesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create shared_notes")
        
        logger.info(f"Shared_notes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating shared_notes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating shared_notes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Shared_notesResponse], status_code=201)
async def create_shared_notess_batch(
    request: Shared_notesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple shared_notess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} shared_notess")
    
    service = Shared_notesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} shared_notess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Shared_notesResponse])
async def update_shared_notess_batch(
    request: Shared_notesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple shared_notess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} shared_notess")
    
    service = Shared_notesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} shared_notess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Shared_notesResponse)
async def update_shared_notes(
    id: int,
    data: Shared_notesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing shared_notes (requires ownership)"""
    logger.debug(f"Updating shared_notes {id} with data: {data}")

    service = Shared_notesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shared_notes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Shared_notes not found")
        
        logger.info(f"Shared_notes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating shared_notes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating shared_notes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_shared_notess_batch(
    request: Shared_notesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple shared_notess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} shared_notess")
    
    service = Shared_notesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} shared_notess successfully")
        return {"message": f"Successfully deleted {deleted_count} shared_notess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_shared_notes(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single shared_notes by ID (requires ownership)"""
    logger.debug(f"Deleting shared_notes with id: {id}")
    
    service = Shared_notesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Shared_notes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Shared_notes not found")
        
        logger.info(f"Shared_notes {id} deleted successfully")
        return {"message": "Shared_notes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shared_notes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
