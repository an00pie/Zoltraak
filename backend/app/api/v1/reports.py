"""API router for crowdsourced reports, station ratings, and availability status."""

from datetime import datetime
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.api.deps import get_db
from backend.app.db.models import StationReport, Station, CommunityCharger

logger = logging.getLogger(__name__)
router = APIRouter()


class ReportCreate(BaseModel):
    station_type: str = Field("public", description="'public' or 'community'")
    station_id: int = Field(..., description="ID of public station or community charger")
    user_name: str = Field("EV Driver", min_length=2, max_length=120)
    user_role: str = Field("customer", description="'customer', 'operator', or 'homeowner'")
    report_status: str = Field(
        ...,
        description="'available', 'busy', 'unavailable', 'broken_connector', or 'ice_blocked'",
    )
    rating: int = Field(5, ge=1, le=5, description="1 to 5 star rating")
    comment: Optional[str] = Field(None, max_length=1000, description="Driver comments or feedback")


@router.post("/reports", status_code=status.HTTP_201_CREATED, tags=["Reports & Crowdsourcing"])
def submit_station_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
):
    """
    Submit a real-time crowdsourced report or rating for any public or community EV charger.
    Updates the live status of the target station if unavailable or available.
    """
    # 1. Validate station existence
    if payload.station_type == "community":
        target_station = db.query(CommunityCharger).filter(CommunityCharger.id == payload.station_id).first()
        if not target_station:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Community charger with ID {payload.station_id} not found",
            )
        # Update live status based on report
        if payload.report_status in ("unavailable", "broken_connector"):
            target_station.availability_status = "unavailable"
        elif payload.report_status == "busy":
            target_station.availability_status = "in_use"
        elif payload.report_status == "available":
            target_station.availability_status = "available"

    else:
        target_station = db.query(Station).filter(Station.id == payload.station_id).first()
        if not target_station:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Station with ID {payload.station_id} not found",
            )
        if payload.report_status in ("unavailable", "broken_connector"):
            target_station.is_operational = False
            target_station.status_type = "Temporarily Unavailable"
        elif payload.report_status == "available":
            target_station.is_operational = True
            target_station.status_type = "Operational"

    # 2. Create the report
    new_report = StationReport(
        station_type=payload.station_type,
        station_id=payload.station_id,
        user_name=payload.user_name.strip(),
        user_role=payload.user_role.strip(),
        report_status=payload.report_status,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else None,
        created_at=datetime.utcnow(),
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # 3. Recalculate average rating
    avg_score = (
        db.query(func.avg(StationReport.rating))
        .filter(
            StationReport.station_type == payload.station_type,
            StationReport.station_id == payload.station_id,
        )
        .scalar()
    ) or payload.rating

    if payload.station_type == "community":
        target_station.trust_score = round(float(avg_score), 1)
        db.commit()

    logger.info(
        f"New crowdsourced report for {payload.station_type} station {payload.station_id}: "
        f"{payload.report_status} ({payload.rating} stars) by {payload.user_name}"
    )

    return {
        "status": "success",
        "message": "Report submitted successfully! Thank you for helping fellow EV drivers.",
        "report": {
            "id": new_report.id,
            "station_type": new_report.station_type,
            "station_id": new_report.station_id,
            "user_name": new_report.user_name,
            "user_role": new_report.user_role,
            "report_status": new_report.report_status,
            "rating": new_report.rating,
            "comment": new_report.comment,
            "created_at": new_report.created_at.isoformat(),
        },
        "average_rating": round(float(avg_score), 1),
    }


@router.get("/reports", tags=["Reports & Crowdsourcing"])
def list_station_reports(
    station_id: int = Query(..., description="Target station ID"),
    station_type: str = Query("public", description="'public' or 'community'"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve crowdsourced reviews, ratings, and latest status reports for a station."""
    from backend.app.db.seed_community_chargers import seed_initial_reports_if_empty
    seed_initial_reports_if_empty(db)

    reports = (
        db.query(StationReport)
        .filter(
            StationReport.station_id == station_id,
            StationReport.station_type == station_type,
        )
        .order_by(StationReport.created_at.desc())
        .limit(limit)
        .all()
    )

    avg_rating = (
        db.query(func.avg(StationReport.rating))
        .filter(
            StationReport.station_id == station_id,
            StationReport.station_type == station_type,
        )
        .scalar()
    )

    latest_report = reports[0] if reports else None
    is_reported_down = (
        latest_report is not None
        and latest_report.report_status in ("unavailable", "broken_connector")
    )

    items = [
        {
            "id": r.id,
            "user_name": r.user_name,
            "user_role": r.user_role,
            "report_status": r.report_status,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]

    return {
        "station_id": station_id,
        "station_type": station_type,
        "total_reports": len(items),
        "average_rating": round(float(avg_rating), 1) if avg_rating else 4.8,
        "latest_status": latest_report.report_status if latest_report else "available",
        "is_reported_down": is_reported_down,
        "reports": items,
    }
