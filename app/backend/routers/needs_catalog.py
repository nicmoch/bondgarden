import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.needs_catalog import Needs_catalogService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/needs_catalog", tags=["needs_catalog"])


# ---------- Pydantic Schemas ----------
class Needs_catalogData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    description: str = None
    icon: str = None
    is_default: bool = None


class Needs_catalogUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_default: Optional[bool] = None


class Needs_catalogResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_default: Optional[bool] = None

    class Config:
        from_attributes = True


class Needs_catalogListResponse(BaseModel):
    """List response schema"""
    items: List[Needs_catalogResponse]
    total: int
    skip: int
    limit: int


class Needs_catalogBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Needs_catalogData]


class Needs_catalogBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Needs_catalogUpdateData


class Needs_catalogBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Needs_catalogBatchUpdateItem]


class Needs_catalogBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Needs_catalogListResponse)
async def query_needs_catalogs(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query needs_catalogs with filtering, sorting, and pagination"""
    logger.debug(f"Querying needs_catalogs: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Needs_catalogService(db)
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
        )
        logger.debug(f"Found {result['total']} needs_catalogs")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying needs_catalogs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Needs_catalogListResponse)
async def query_needs_catalogs_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query needs_catalogs with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying needs_catalogs: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Needs_catalogService(db)
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
        logger.debug(f"Found {result['total']} needs_catalogs")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying needs_catalogs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Needs_catalogResponse)
async def get_needs_catalog(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single needs_catalog by ID"""
    logger.debug(f"Fetching needs_catalog with id: {id}, fields={fields}")
    
    service = Needs_catalogService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Needs_catalog with id {id} not found")
            raise HTTPException(status_code=404, detail="Needs_catalog not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching needs_catalog {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Needs_catalogResponse, status_code=201)
async def create_needs_catalog(
    data: Needs_catalogData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new needs_catalog"""
    logger.debug(f"Creating new needs_catalog with data: {data}")
    
    service = Needs_catalogService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create needs_catalog")
        
        logger.info(f"Needs_catalog created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating needs_catalog: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating needs_catalog: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Needs_catalogResponse], status_code=201)
async def create_needs_catalogs_batch(
    request: Needs_catalogBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple needs_catalogs in a single request"""
    logger.debug(f"Batch creating {len(request.items)} needs_catalogs")
    
    service = Needs_catalogService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} needs_catalogs successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Needs_catalogResponse])
async def update_needs_catalogs_batch(
    request: Needs_catalogBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple needs_catalogs in a single request"""
    logger.debug(f"Batch updating {len(request.items)} needs_catalogs")
    
    service = Needs_catalogService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} needs_catalogs successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Needs_catalogResponse)
async def update_needs_catalog(
    id: int,
    data: Needs_catalogUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing needs_catalog"""
    logger.debug(f"Updating needs_catalog {id} with data: {data}")

    service = Needs_catalogService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Needs_catalog with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Needs_catalog not found")
        
        logger.info(f"Needs_catalog {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating needs_catalog {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating needs_catalog {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_needs_catalogs_batch(
    request: Needs_catalogBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple needs_catalogs by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} needs_catalogs")
    
    service = Needs_catalogService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} needs_catalogs successfully")
        return {"message": f"Successfully deleted {deleted_count} needs_catalogs", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_needs_catalog(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single needs_catalog by ID"""
    logger.debug(f"Deleting needs_catalog with id: {id}")
    
    service = Needs_catalogService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Needs_catalog with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Needs_catalog not found")
        
        logger.info(f"Needs_catalog {id} deleted successfully")
        return {"message": "Needs_catalog deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting needs_catalog {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
