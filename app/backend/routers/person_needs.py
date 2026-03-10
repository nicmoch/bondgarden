import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.person_needs import Person_needsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/person_needs", tags=["person_needs"])


# ---------- Pydantic Schemas ----------
class Person_needsData(BaseModel):
    """Entity data schema (for create/update)"""
    person_id: int
    need_id: int = None
    custom_need_name: str = None
    priority: int = None
    created_at: Optional[datetime] = None


class Person_needsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    person_id: Optional[int] = None
    need_id: Optional[int] = None
    custom_need_name: Optional[str] = None
    priority: Optional[int] = None
    created_at: Optional[datetime] = None


class Person_needsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    person_id: int
    need_id: Optional[int] = None
    custom_need_name: Optional[str] = None
    priority: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Person_needsListResponse(BaseModel):
    """List response schema"""
    items: List[Person_needsResponse]
    total: int
    skip: int
    limit: int


class Person_needsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Person_needsData]


class Person_needsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Person_needsUpdateData


class Person_needsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Person_needsBatchUpdateItem]


class Person_needsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Person_needsListResponse)
async def query_person_needss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query person_needss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying person_needss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Person_needsService(db)
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
        logger.debug(f"Found {result['total']} person_needss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying person_needss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Person_needsListResponse)
async def query_person_needss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query person_needss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying person_needss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Person_needsService(db)
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
        logger.debug(f"Found {result['total']} person_needss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying person_needss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Person_needsResponse)
async def get_person_needs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single person_needs by ID (user can only see their own records)"""
    logger.debug(f"Fetching person_needs with id: {id}, fields={fields}")
    
    service = Person_needsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Person_needs with id {id} not found")
            raise HTTPException(status_code=404, detail="Person_needs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching person_needs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Person_needsResponse, status_code=201)
async def create_person_needs(
    data: Person_needsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new person_needs"""
    logger.debug(f"Creating new person_needs with data: {data}")
    
    service = Person_needsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create person_needs")
        
        logger.info(f"Person_needs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating person_needs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating person_needs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Person_needsResponse], status_code=201)
async def create_person_needss_batch(
    request: Person_needsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple person_needss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} person_needss")
    
    service = Person_needsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} person_needss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Person_needsResponse])
async def update_person_needss_batch(
    request: Person_needsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple person_needss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} person_needss")
    
    service = Person_needsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} person_needss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Person_needsResponse)
async def update_person_needs(
    id: int,
    data: Person_needsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing person_needs (requires ownership)"""
    logger.debug(f"Updating person_needs {id} with data: {data}")

    service = Person_needsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Person_needs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Person_needs not found")
        
        logger.info(f"Person_needs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating person_needs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating person_needs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_person_needss_batch(
    request: Person_needsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple person_needss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} person_needss")
    
    service = Person_needsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} person_needss successfully")
        return {"message": f"Successfully deleted {deleted_count} person_needss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_person_needs(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single person_needs by ID (requires ownership)"""
    logger.debug(f"Deleting person_needs with id: {id}")
    
    service = Person_needsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Person_needs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Person_needs not found")
        
        logger.info(f"Person_needs {id} deleted successfully")
        return {"message": "Person_needs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting person_needs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
