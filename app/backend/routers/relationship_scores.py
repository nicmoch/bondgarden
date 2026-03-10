import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.relationship_scores import Relationship_scoresService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/relationship_scores", tags=["relationship_scores"])


# ---------- Pydantic Schemas ----------
class Relationship_scoresData(BaseModel):
    """Entity data schema (for create/update)"""
    person_id: int
    balance_score: float = None
    health_score: float = None
    needs_score: float = None
    trend: str = None
    last_interaction_date: Optional[date] = None
    updated_at: Optional[datetime] = None


class Relationship_scoresUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    person_id: Optional[int] = None
    balance_score: Optional[float] = None
    health_score: Optional[float] = None
    needs_score: Optional[float] = None
    trend: Optional[str] = None
    last_interaction_date: Optional[date] = None
    updated_at: Optional[datetime] = None


class Relationship_scoresResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    person_id: int
    balance_score: Optional[float] = None
    health_score: Optional[float] = None
    needs_score: Optional[float] = None
    trend: Optional[str] = None
    last_interaction_date: Optional[date] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Relationship_scoresListResponse(BaseModel):
    """List response schema"""
    items: List[Relationship_scoresResponse]
    total: int
    skip: int
    limit: int


class Relationship_scoresBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Relationship_scoresData]


class Relationship_scoresBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Relationship_scoresUpdateData


class Relationship_scoresBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Relationship_scoresBatchUpdateItem]


class Relationship_scoresBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Relationship_scoresListResponse)
async def query_relationship_scoress(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query relationship_scoress with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying relationship_scoress: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Relationship_scoresService(db)
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
        logger.debug(f"Found {result['total']} relationship_scoress")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying relationship_scoress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Relationship_scoresListResponse)
async def query_relationship_scoress_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query relationship_scoress with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying relationship_scoress: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Relationship_scoresService(db)
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
        logger.debug(f"Found {result['total']} relationship_scoress")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying relationship_scoress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Relationship_scoresResponse)
async def get_relationship_scores(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single relationship_scores by ID (user can only see their own records)"""
    logger.debug(f"Fetching relationship_scores with id: {id}, fields={fields}")
    
    service = Relationship_scoresService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Relationship_scores with id {id} not found")
            raise HTTPException(status_code=404, detail="Relationship_scores not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching relationship_scores {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Relationship_scoresResponse, status_code=201)
async def create_relationship_scores(
    data: Relationship_scoresData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new relationship_scores"""
    logger.debug(f"Creating new relationship_scores with data: {data}")
    
    service = Relationship_scoresService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create relationship_scores")
        
        logger.info(f"Relationship_scores created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating relationship_scores: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating relationship_scores: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Relationship_scoresResponse], status_code=201)
async def create_relationship_scoress_batch(
    request: Relationship_scoresBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple relationship_scoress in a single request"""
    logger.debug(f"Batch creating {len(request.items)} relationship_scoress")
    
    service = Relationship_scoresService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} relationship_scoress successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Relationship_scoresResponse])
async def update_relationship_scoress_batch(
    request: Relationship_scoresBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple relationship_scoress in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} relationship_scoress")
    
    service = Relationship_scoresService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} relationship_scoress successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Relationship_scoresResponse)
async def update_relationship_scores(
    id: int,
    data: Relationship_scoresUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing relationship_scores (requires ownership)"""
    logger.debug(f"Updating relationship_scores {id} with data: {data}")

    service = Relationship_scoresService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Relationship_scores with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Relationship_scores not found")
        
        logger.info(f"Relationship_scores {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating relationship_scores {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating relationship_scores {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_relationship_scoress_batch(
    request: Relationship_scoresBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple relationship_scoress by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} relationship_scoress")
    
    service = Relationship_scoresService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} relationship_scoress successfully")
        return {"message": f"Successfully deleted {deleted_count} relationship_scoress", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_relationship_scores(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single relationship_scores by ID (requires ownership)"""
    logger.debug(f"Deleting relationship_scores with id: {id}")
    
    service = Relationship_scoresService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Relationship_scores with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Relationship_scores not found")
        
        logger.info(f"Relationship_scores {id} deleted successfully")
        return {"message": "Relationship_scores deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting relationship_scores {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
