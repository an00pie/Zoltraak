"""Station querying API with H3 spatial cell filtering, GeoJSON hexagon grids, and metadata."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from backend.app.api.deps import get_db
from backend.app.db.models import Station, StationConnector
from backend.app.schemas.station import StationRead, StationListResponse
from backend.app.ingestion.h3_indexer import H3SpatialIndexer

router = APIRouter()


@router.get("/stations/metadata", tags=["Stations"])
def get_stations_metadata(db: Session = Depends(get_db)):
    """Retrieve aggregate metadata (operators, connector types, count) to populate frontend filters dynamically."""
    total_stations = db.query(Station).count()
    operators = [
        op[0]
        for op in db.query(Station.operator_name)
        .filter(Station.operator_name.isnot(None))
        .distinct()
        .order_by(Station.operator_name.asc())
        .all()
    ]
    connector_types = [
        ct[0]
        for ct in db.query(StationConnector.connector_type)
        .filter(StationConnector.connector_type.isnot(None))
        .distinct()
        .order_by(StationConnector.connector_type.asc())
        .all()
    ]

    return {
        "total_stations": total_stations,
        "operators": operators,
        "connector_types": connector_types,
        "power_brackets": [
            {"label": "Any Power", "min_kw": 0},
            {"label": "Standard AC (≥7.4 kW)", "min_kw": 7.4},
            {"label": "Fast AC/DC (≥22 kW)", "min_kw": 22.0},
            {"label": "DC Fast (≥50 kW)", "min_kw": 50.0},
            {"label": "Ultra-Fast (≥100 kW)", "min_kw": 100.0},
        ],
    }


@router.get("/stations/h3-grid", tags=["Stations"])
def get_h3_grid_geojson(
    city: Optional[str] = Query(None, description="Optional city filter"),
    operator: Optional[str] = Query(None, description="Optional operator filter"),
    connector_type: Optional[str] = Query(None, description="Optional connector filter"),
    min_power_kw: Optional[float] = Query(None, ge=0, description="Optional min power filter"),
    db: Session = Depends(get_db),
):
    """
    Returns GeoJSON FeatureCollection of H3 hexagons covering active charging stations.
    Includes density counts, average power ratings, and operator tallies per cell.
    """
    query = db.query(
        Station.h3_cell,
        func.count(distinct(Station.id)).label("station_count"),
        func.avg(StationConnector.power_kw).label("avg_power"),
    ).outerjoin(Station.connectors)

    if city:
        query = query.filter(Station.city.ilike(f"%{city}%"))
    if operator:
        query = query.filter(Station.operator_name.ilike(f"%{operator}%"))
    if connector_type:
        query = query.filter(StationConnector.connector_type.ilike(f"%{connector_type}%"))
    if min_power_kw is not None:
        query = query.filter(StationConnector.power_kw >= min_power_kw)

    results = query.group_by(Station.h3_cell).all()

    features: List[Dict[str, Any]] = []
    for h3_cell, station_count, avg_power in results:
        if not H3SpatialIndexer.is_valid_h3(h3_cell):
            continue
        try:
            boundary = H3SpatialIndexer.h3_to_polygon_coordinates(h3_cell)
            # GeoJSON requires [lng, lat] order and a closed outer ring
            geojson_ring = [[lng, lat] for lat, lng in boundary]
            geojson_ring.append(geojson_ring[0])

            features.append({
                "type": "Feature",
                "id": h3_cell,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [geojson_ring],
                },
                "properties": {
                    "h3_cell": h3_cell,
                    "station_count": station_count,
                    "avg_power_kw": round(float(avg_power), 1) if avg_power is not None else None,
                },
            })
        except Exception:
            continue

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/stations", response_model=StationListResponse, tags=["Stations"])
def list_stations(
    h3_cell: Optional[str] = Query(None, description="Exact H3 cell index to filter by"),
    h3_disk_radius: Optional[int] = Query(0, ge=0, le=5, description="Search k-ring neighbor disk around h3_cell"),
    city: Optional[str] = Query(None, description="Filter by city name (case-insensitive substring)"),
    operator: Optional[str] = Query(None, description="Filter by operator name"),
    connector_type: Optional[str] = Query(None, description="Filter by connector type (e.g., 'CCS2', 'Type 2')"),
    min_power_kw: Optional[float] = Query(None, ge=0, description="Filter stations with at least this power kW"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
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
