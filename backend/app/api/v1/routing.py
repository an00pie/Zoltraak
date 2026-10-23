"""API endpoints for EV route planning, OSRM road geometry, and corridor candidate stations."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.db.models import Station
from backend.app.routing.osrm import OSRMClient
from backend.app.routing.corridor import CorridorAnalyzer, haversine_distance

router = APIRouter()
osrm_client = OSRMClient()


class RouteLocation(BaseModel):
    name: str
    latitude: float
    longitude: float


class RoutePlanRequest(BaseModel):
    origin: RouteLocation
    destination: RouteLocation
    current_soc: float = Field(40.0, ge=1.0, le=100.0, description="Current battery State of Charge (%)")
    battery_capacity_kwh: float = Field(40.5, ge=10.0, le=200.0, description="EV battery pack capacity (kWh)")
    min_reserve_soc: float = Field(15.0, ge=5.0, le=50.0, description="Desired minimum reserve at destination (%)")
    selected_station_id: Optional[int] = Field(None, description="Optional intermediate station to route through")


@router.get("/routing/preset-cities", tags=["Routing"])
def get_preset_cities():
    """Retrieve predefined key cities along popular Indian EV highway corridors."""
    return [
        {"name": "Kochi (Ernakulam)", "state": "Kerala", "latitude": 9.9312, "longitude": 76.2673},
        {"name": "Chalakudy", "state": "Kerala", "latitude": 10.3031, "longitude": 76.3370},
        {"name": "Thrissur", "state": "Kerala", "latitude": 10.5276, "longitude": 76.2144},
        {"name": "Palakkad", "state": "Kerala", "latitude": 10.7867, "longitude": 76.6548},
        {"name": "Coimbatore", "state": "Tamil Nadu", "latitude": 11.0168, "longitude": 76.9558},
        {"name": "Bengaluru", "state": "Karnataka", "latitude": 12.9716, "longitude": 77.5946},
        {"name": "Mysuru", "state": "Karnataka", "latitude": 12.2958, "longitude": 76.6394},
        {"name": "Chennai", "state": "Tamil Nadu", "latitude": 13.0827, "longitude": 80.2707},
        {"name": "Mumbai", "state": "Maharashtra", "latitude": 19.0760, "longitude": 72.8777},
        {"name": "Pune", "state": "Maharashtra", "latitude": 18.5204, "longitude": 73.8567},
    ]


@router.post("/routing/plan", tags=["Routing"])
def plan_ev_route(
    request: RoutePlanRequest,
    db: Session = Depends(get_db),
):
    """
    Compute direct road route via OSRM, identify corridor charging candidates,
    compute detours, rate candidates (Optimal / Acceptable / Suboptimal), and optionally
    calculate multi-stop route passing through a chosen charging station.
    """
    origin = request.origin
    dest = request.destination

    # 1. Direct OSRM Route
    direct_route = osrm_client.get_route(
        origin_lng=origin.longitude,
        origin_lat=origin.latitude,
        dest_lng=dest.longitude,
        dest_lat=dest.latitude,
    )

    direct_dist_km = direct_route["distance_km"]
    direct_duration_min = direct_route["duration_min"]

    # 2. Evaluate Candidate Stations along the Corridor
    candidates = CorridorAnalyzer.evaluate_corridor_candidates(
        db=db,
        origin_lat=origin.latitude,
        origin_lng=origin.longitude,
        dest_lat=dest.latitude,
        dest_lng=dest.longitude,
        current_soc=request.current_soc,
        battery_capacity_kwh=request.battery_capacity_kwh,
        min_reserve_soc=request.min_reserve_soc,
    )

    # 3. Energy Feasibility Check without stops
    energy_needed_kwh = direct_dist_km * CorridorAnalyzer.EV_CONSUMPTION_KWH_PER_KM
    available_energy_kwh = request.battery_capacity_kwh * (request.current_soc / 100.0)
    direct_arrival_soc = round(
        max(0.0, ((available_energy_kwh - energy_needed_kwh) / request.battery_capacity_kwh) * 100.0),
        1,
    )
    is_direct_feasible = (available_energy_kwh - energy_needed_kwh) >= (
        request.battery_capacity_kwh * (request.min_reserve_soc / 100.0)
    )

    # 4. Multi-stop Routing through chosen station if provided
    routed_via_station = None
    if request.selected_station_id:
        station = db.query(Station).filter(Station.id == request.selected_station_id).first()
        if station:
            stop_route = osrm_client.get_route_via_waypoint(
                origin_lng=origin.longitude,
                origin_lat=origin.latitude,
                stop_lng=station.longitude,
                stop_lat=station.latitude,
                dest_lng=dest.longitude,
                dest_lat=dest.latitude,
            )
            detour_km = round(stop_route["distance_km"] - direct_dist_km, 2)
            routed_via_station = {
                "station_id": station.id,
                "station_name": station.name,
                "station_latitude": station.latitude,
                "station_longitude": station.longitude,
                "total_distance_km": stop_route["distance_km"],
                "total_duration_min": stop_route["duration_min"],
                "detour_km": max(0.0, detour_km),
                "detour_duration_min": max(0.0, round(stop_route["duration_min"] - direct_duration_min, 1)),
                "coordinates": stop_route["coordinates"],
            }

    return {
        "origin": origin.model_dump(),
        "destination": dest.model_dump(),
        "battery_parameters": {
            "current_soc": request.current_soc,
            "battery_capacity_kwh": request.battery_capacity_kwh,
            "min_reserve_soc": request.min_reserve_soc,
            "available_range_km": round((available_energy_kwh / CorridorAnalyzer.EV_CONSUMPTION_KWH_PER_KM), 1),
            "is_direct_feasible": is_direct_feasible,
            "direct_arrival_soc": direct_arrival_soc,
        },
        "direct_route": direct_route,
        "routed_via_station": routed_via_station,
        "candidate_stations": candidates,
        "metrics": {
            "total_candidates": len(candidates),
            "optimal_count": sum(1 for c in candidates if c["tier"] == "optimal"),
            "acceptable_count": sum(1 for c in candidates if c["tier"] == "acceptable"),
            "suboptimal_count": sum(1 for c in candidates if c["tier"] == "suboptimal"),
        },
    }
