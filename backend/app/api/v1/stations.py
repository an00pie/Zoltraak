"""Station querying API with H3 spatial cell filtering and pagination."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.api.deps import get_db
from backend.app.db.models import Station, StationConnector
from backend.app.schemas.station import StationRead, StationListResponse
from backend.app.ingestion.h3_indexer import H3SpatialIndexer

router = APIRouter()


@router.get("/stations", response_model=StationListResponse, tags=["Stations"])
def list_stations(
    h3_cell: Optional[str] = Query(None, description="Exact H3 cell index to filter by"),
    h3_disk_radius: Optional[int] = Query(0, ge=0, le=5, description="Search k-ring neighbor disk around h3_cell"),
    city: Optional[str] = Query(None, description="Filter by city name (case-insensitive substring)"),
    operator: Optional[str] = Query(None, description="Filter by operator name"),
    connector_type: Optional[str] = Query(None, description="Filter by connector type (e.g., 'CCS2', 'Type 2')"),
    min_power_kw: Optional[float] = Query(None, ge=0, description="Filter stations with at least this power kW"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    List charging stations with spatial H3 indexing, operator, connector, and power filters.
    """
    query = db.query(Station)

    # Spatial H3 Filtering
    if h3_cell:
        if not H3SpatialIndexer.is_valid_h3(h3_cell):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid H3 cell index: {h3_cell}",
            )
        if h3_disk_radius and h3_disk_radius > 0:
            neighbor_cells = list(H3SpatialIndexer.get_h3_disk(h3_cell, k=h3_disk_radius))
            query = query.filter(Station.h3_cell.in_(neighbor_cells))
        else:
            query = query.filter(Station.h3_cell == h3_cell)

    # City filter
    if city:
        query = query.filter(Station.city.ilike(f"%{city}%"))

    # Operator filter
    if operator:
        query = query.filter(Station.operator_name.ilike(f"%{operator}%"))

    # Connector & Power filters
    if connector_type or min_power_kw is not None:
        query = query.join(Station.connectors)
        if connector_type:
            query = query.filter(StationConnector.connector_type.ilike(f"%{connector_type}%"))
        if min_power_kw is not None:
            query = query.filter(StationConnector.power_kw >= min_power_kw)
        query = query.distinct()

    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(Station.id.asc()).offset(offset).limit(page_size).all()

    return StationListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/stations/{station_id}", response_model=StationRead, tags=["Stations"])
def get_station(
    station_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve detailed charging station profile including connectors and spatial indices."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station with ID {station_id} not found",
        )
    return station
