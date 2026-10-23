"""API router for peer-to-peer community home EV chargers."""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models import CommunityCharger
from backend.app.db.seed_community_chargers import STANDARD_COMMUNITY_PRICE_PER_KWH, seed_community_chargers_if_empty
from backend.app.ingestion.h3_indexer import H3SpatialIndexer

logger = logging.getLogger(__name__)
router = APIRouter()


class CommunityChargerCreate(BaseModel):
    host_name: str = Field(..., min_length=2, max_length=120, description="Name of homeowner / host")
    title: str = Field(..., min_length=3, max_length=200, description="Title for home charger listing")
    phone: str = Field(..., min_length=8, max_length=50, description="Contact phone or WhatsApp number")
    address: str = Field(..., min_length=5, max_length=500, description="Full residential address")
    city: str = Field(..., min_length=2, max_length=100, description="City / town in Kerala")
    state: str = Field("Kerala", max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    connector_type: str = Field("Type 2 (AC)", max_length=50)
    power_kw: float = Field(7.4, ge=1.0, le=50.0, description="Charger output rating (kW)")
    price_per_kwh: float = Field(STANDARD_COMMUNITY_PRICE_PER_KWH, ge=5.0, le=50.0, description="Fixed price per kWh")
    access_hours: str = Field("6:00 AM - 10:00 PM", max_length=100)
    amenities: str = Field("Covered Parking, Wi-Fi, Restroom", max_length=255)
    notes: Optional[str] = Field(None, description="Helpful notes for visiting drivers")


class CommunityChargerStatusUpdate(BaseModel):
    availability_status: str = Field(..., description="'available', 'in_use', or 'reserved'")
    queue_count: int = Field(0, ge=0, le=20, description="Current number of vehicles queued")


@router.get("/community-chargers", tags=["Community Chargers"])
def list_community_chargers(
    city: Optional[str] = Query(None, description="Filter by city name"),
    connector_type: Optional[str] = Query(None, description="Filter by connector type"),
    min_power_kw: Optional[float] = Query(None, description="Minimum power in kW"),
    availability_status: Optional[str] = Query(None, description="Filter by availability status"),
    min_lat: Optional[float] = Query(None, description="Viewport south latitude"),
    max_lat: Optional[float] = Query(None, description="Viewport north latitude"),
    min_lng: Optional[float] = Query(None, description="Viewport west longitude"),
    max_lng: Optional[float] = Query(None, description="Viewport east longitude"),
    as_geojson: bool = Query(False, description="Return as GeoJSON FeatureCollection"),
    db: Session = Depends(get_db),
):
    """List peer-to-peer community home EV chargers with optional spatial bounding."""
    # Ensure synthetic seed chargers exist
    seed_community_chargers_if_empty(db)

    query = db.query(CommunityCharger)

    if city:
        query = query.filter(CommunityCharger.city.ilike(f"%{city}%"))
    if connector_type:
        query = query.filter(CommunityCharger.connector_type.ilike(f"%{connector_type}%"))
    if min_power_kw is not None:
        query = query.filter(CommunityCharger.power_kw >= min_power_kw)
    if availability_status:
        query = query.filter(CommunityCharger.availability_status == availability_status)

    # Viewport bounding box filter
    if None not in (min_lat, max_lat, min_lng, max_lng):
        query = query.filter(
            CommunityCharger.latitude.between(min_lat, max_lat),
            CommunityCharger.longitude.between(min_lng, max_lng),
        )

    chargers = query.order_by(CommunityCharger.id.asc()).all()

    if as_geojson:
        features = [
            {
                "type": "Feature",
                "id": c.id,
                "geometry": {
                    "type": "Point",
                    "coordinates": [c.longitude, c.latitude],
                },
                "properties": {
                    "id": c.id,
                    "host_name": c.host_name,
                    "title": c.title,
                    "phone": c.phone,
                    "address": c.address,
                    "city": c.city,
                    "state": c.state,
                    "connector_type": c.connector_type,
                    "power_kw": c.power_kw,
                    "price_per_kwh": c.price_per_kwh,
                    "availability_status": c.availability_status,
                    "queue_count": c.queue_count,
                    "trust_score": c.trust_score,
                    "total_charges_served": c.total_charges_served,
                    "access_hours": c.access_hours,
                    "amenities": c.amenities,
                    "notes": c.notes,
                    "is_community_host": True,
                },
            }
            for c in chargers
        ]
        return {
            "type": "FeatureCollection",
            "features": features,
        }

    return [
        {
            "id": c.id,
            "host_name": c.host_name,
            "title": c.title,
            "phone": c.phone,
            "address": c.address,
            "city": c.city,
            "state": c.state,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "h3_cell": c.h3_cell,
            "connector_type": c.connector_type,
            "power_kw": c.power_kw,
            "price_per_kwh": c.price_per_kwh,
            "availability_status": c.availability_status,
            "queue_count": c.queue_count,
            "trust_score": c.trust_score,
            "total_charges_served": c.total_charges_served,
            "access_hours": c.access_hours,
            "amenities": c.amenities,
            "notes": c.notes,
            "is_community_host": True,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in chargers
    ]


@router.post("/community-chargers", status_code=status.HTTP_201_CREATED, tags=["Community Chargers"])
def create_community_charger(
    payload: CommunityChargerCreate,
    db: Session = Depends(get_db),
):
    """List a new homeowner / community EV charger."""
    try:
        h3_cell = H3SpatialIndexer.coordinate_to_h3(payload.latitude, payload.longitude, resolution=8)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid coordinates: {e}",
        )

    # Standard fixed price enforcement per specification
    fixed_price = STANDARD_COMMUNITY_PRICE_PER_KWH

    new_charger = CommunityCharger(
        host_name=payload.host_name.strip(),
        title=payload.title.strip(),
        phone=payload.phone.strip(),
        address=payload.address.strip(),
        city=payload.city.strip(),
        state=payload.state.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        h3_cell=h3_cell,
        connector_type=payload.connector_type,
        power_kw=payload.power_kw,
        price_per_kwh=fixed_price,
        availability_status="available",
        queue_count=0,
        trust_score=5.0,  # New host starting score
        total_charges_served=0,
        access_hours=payload.access_hours,
        amenities=payload.amenities,
        notes=payload.notes,
    )

    db.add(new_charger)
    db.commit()
    db.refresh(new_charger)

    logger.info(f"Created new community charger id={new_charger.id} in {new_charger.city} by {new_charger.host_name}")

    return {
        "status": "success",
        "message": f"Community charger '{new_charger.title}' listed successfully!",
        "charger": {
            "id": new_charger.id,
            "host_name": new_charger.host_name,
            "title": new_charger.title,
            "phone": new_charger.phone,
            "address": new_charger.address,
            "city": new_charger.city,
            "state": new_charger.state,
            "latitude": new_charger.latitude,
            "longitude": new_charger.longitude,
            "h3_cell": new_charger.h3_cell,
            "connector_type": new_charger.connector_type,
            "power_kw": new_charger.power_kw,
            "price_per_kwh": new_charger.price_per_kwh,
            "availability_status": new_charger.availability_status,
            "queue_count": new_charger.queue_count,
            "trust_score": new_charger.trust_score,
            "total_charges_served": new_charger.total_charges_served,
            "access_hours": new_charger.access_hours,
            "amenities": new_charger.amenities,
            "notes": new_charger.notes,
            "is_community_host": True,
        },
    }


@router.get("/community-chargers/{charger_id}", tags=["Community Chargers"])
def get_community_charger(
    charger_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve full profile of a community home charger."""
    charger = db.query(CommunityCharger).filter(CommunityCharger.id == charger_id).first()
    if not charger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community charger with ID {charger_id} not found",
        )
    return charger


@router.patch("/community-chargers/{charger_id}/status", tags=["Community Chargers"])
def update_charger_status(
    charger_id: int,
    payload: CommunityChargerStatusUpdate,
    db: Session = Depends(get_db),
):
    """Update live availability status and queue count."""
    charger = db.query(CommunityCharger).filter(CommunityCharger.id == charger_id).first()
    if not charger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community charger with ID {charger_id} not found",
        )

    charger.availability_status = payload.availability_status
    charger.queue_count = payload.queue_count
    db.commit()
    db.refresh(charger)

    return {
        "status": "success",
        "id": charger.id,
        "availability_status": charger.availability_status,
        "queue_count": charger.queue_count,
    }
