import math
from typing import List, Optional, Dict, Any, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
import h3

from backend.app.api.deps import get_db
from backend.app.db.models import Station, StationConnector
from backend.app.schemas.station import StationRead, StationListResponse
from backend.app.ingestion.h3_indexer import H3SpatialIndexer
from backend.app.routing.corridor import haversine_distance

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
    resolution: Optional[int] = Query(None, ge=4, le=12, description="Target H3 resolution for dynamic hexagon tessellation"),
    zoom: Optional[float] = Query(None, ge=0.0, le=24.0, description="Current map zoom level to auto-derive H3 resolution"),
    min_lat: Optional[float] = Query(None, description="Bounding box minimum latitude"),
    max_lat: Optional[float] = Query(None, description="Bounding box maximum latitude"),
    min_lng: Optional[float] = Query(None, description="Bounding box minimum longitude"),
    max_lng: Optional[float] = Query(None, description="Bounding box maximum longitude"),
    city: Optional[str] = Query(None, description="Optional city filter"),
    operator: Optional[str] = Query(None, description="Optional operator filter"),
    connector_type: Optional[str] = Query(None, description="Optional connector filter"),
    min_power_kw: Optional[float] = Query(None, ge=0, description="Optional min power filter"),
    db: Session = Depends(get_db),
):
    """
    Returns GeoJSON FeatureCollection of Uber H3 hexagons covering active charging stations.
    Dynamically subdivides into higher-resolution child cells on zoom-in,
    and aggregates into parent cells on zoom-out.
    """
    if resolution is not None:
        target_res = resolution
    elif zoom is not None:
        target_res = H3SpatialIndexer.zoom_to_resolution(zoom)
    else:
        target_res = 8

    query = db.query(Station)

    # Viewport Bounding Box filter (speeds up spatial searches to visible area)
    if min_lat is not None and max_lat is not None:
        # Pad bounds slightly so border hexagons don't clip
        padding = 0.05
        query = query.filter(Station.latitude.between(min_lat - padding, max_lat + padding))
    if min_lng is not None and max_lng is not None:
        padding = 0.05
        query = query.filter(Station.longitude.between(min_lng - padding, max_lng + padding))

    if city:
        query = query.filter(Station.city.ilike(f"%{city}%"))
    if operator:
        query = query.filter(Station.operator_name.ilike(f"%{operator}%"))
    if connector_type or min_power_kw is not None:
        query = query.join(Station.connectors)
        if connector_type:
            query = query.filter(StationConnector.connector_type.ilike(f"%{connector_type}%"))
        if min_power_kw is not None:
            query = query.filter(StationConnector.power_kw >= min_power_kw)
        query = query.distinct()

    stations = query.all()

    # Group stations by their dynamic H3 cell at target_res
    cell_groups: Dict[str, Dict[str, Any]] = {}
    for st in stations:
        try:
            cell = h3.latlng_to_cell(st.latitude, st.longitude, target_res)
        except Exception:
            continue

        st_powers = [c.power_kw for c in st.connectors if c.power_kw is not None]
        max_power = max(st_powers, default=None)

        if cell not in cell_groups:
            cell_groups[cell] = {
                "station_count": 0,
                "powers": [],
                "stations": [],
                "operators": set(),
            }
        cell_groups[cell]["station_count"] += 1
        if max_power:
            cell_groups[cell]["powers"].append(max_power)
        if st.operator_name:
            cell_groups[cell]["operators"].add(st.operator_name)
        if len(cell_groups[cell]["stations"]) < 5:
            cell_groups[cell]["stations"].append({"id": st.id, "name": st.name})

    features: List[Dict[str, Any]] = []
    for cell, data in cell_groups.items():
        try:
            boundary = H3SpatialIndexer.h3_to_polygon_coordinates(cell)
            # GeoJSON polygon: [lng, lat] coordinate pairs closed at the end
            geojson_ring = [[lng, lat] for lat, lng in boundary]
            geojson_ring.append(geojson_ring[0])

            avg_power = (
                round(sum(data["powers"]) / len(data["powers"]), 1)
                if data["powers"]
                else None
            )

            features.append({
                "type": "Feature",
                "id": cell,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [geojson_ring],
                },
                "properties": {
                    "h3_cell": cell,
                    "resolution": target_res,
                    "station_count": data["station_count"],
                    "avg_power_kw": avg_power,
                    "operators": list(data["operators"])[:3],
                    "stations_preview": data["stations"],
                },
            })
        except Exception:
            continue

    return {
        "type": "FeatureCollection",
        "resolution": target_res,
        "features": features,
    }


@router.get("/stations/nearby", tags=["Stations"])
def get_nearby_stations(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude of current visible map"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude of current visible map"),
    radius_km: float = Query(35.0, ge=0.5, le=300.0, description="Search radius in kilometers around center"),
    connector_type: Optional[str] = Query(None, description="Optional connector filter (e.g. CCS2, Type 2)"),
    min_power_kw: Optional[float] = Query(None, ge=0.0, description="Optional minimum power in kW"),
    sort_by: str = Query("distance", description="Sort by: 'distance' (closest first), 'power' (fastest charger first), or 'name'"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of stations to return"),
    db: Session = Depends(get_db),
):
    """
    Dynamically find and rank charging stations near the center of the current visible map viewport.
    Accelerated with spatial bounding and sorted by distance, power rating, and charging type.
    """
    # Quick spatial bounding box filter (~111 km per latitude degree)
    lat_delta = (radius_km + 5.0) / 110.0
    cos_lat = max(0.15, math.cos(math.radians(latitude)))
    lng_delta = (radius_km + 5.0) / (110.0 * cos_lat)

    query = db.query(Station).filter(
        Station.latitude.between(latitude - lat_delta, latitude + lat_delta),
        Station.longitude.between(longitude - lng_delta, longitude + lng_delta),
    )

    if connector_type or min_power_kw is not None:
        query = query.join(Station.connectors)
        if connector_type:
            query = query.filter(StationConnector.connector_type.ilike(f"%{connector_type}%"))
        if min_power_kw is not None:
            query = query.filter(StationConnector.power_kw >= min_power_kw)
        query = query.distinct()

    raw_stations = query.all()

    # Exact haversine filtering and sorting
    nearby_items = []
    for st in raw_stations:
        dist_km = haversine_distance(latitude, longitude, st.latitude, st.longitude)
        if dist_km <= radius_km:
            st_powers = [c.power_kw for c in st.connectors if c.power_kw is not None]
            max_kw = max(st_powers, default=None)
            connectors_summary = [
                {
                    "connector_type": c.connector_type,
                    "power_kw": c.power_kw,
                    "current_type": c.current_type,
                    "quantity": c.quantity,
                }
                for c in st.connectors
            ]
            nearby_items.append({
                "id": st.id,
                "name": st.name,
                "operator_name": st.operator_name,
                "address": st.address,
                "city": st.city,
                "state": st.state,
                "latitude": st.latitude,
                "longitude": st.longitude,
                "h3_cell": st.h3_cell,
                "max_power_kw": max_kw,
                "is_operational": st.is_operational,
                "distance_km": round(dist_km, 2),
                "connectors": connectors_summary,
            })

    # Sorting
    if sort_by == "power":
        nearby_items.sort(key=lambda s: (-(s["max_power_kw"] or 0), s["distance_km"]))
    elif sort_by == "name":
        nearby_items.sort(key=lambda s: s["name"].lower())
    else:  # default "distance"
        nearby_items.sort(key=lambda s: s["distance_km"])

    return {
        "center": {
            "latitude": round(latitude, 5),
            "longitude": round(longitude, 5),
        },
        "radius_km": radius_km,
        "total_nearby": len(nearby_items),
        "items": nearby_items[:limit],
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
