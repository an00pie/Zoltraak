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
    auto_select_optimal: bool = Field(True, description="Automatically pick and route through the most optimal EV charging station")


@router.get("/routing/preset-cities", tags=["Routing"])
def get_preset_cities():
    """Retrieve predefined key cities along popular Indian EV highway corridors."""
    return [
        # Kerala NH-544 & NH-66 Corridor
        {"name": "Kochi (Ernakulam)", "state": "Kerala", "latitude": 9.9312, "longitude": 76.2673},
        {"name": "Aluva", "state": "Kerala", "latitude": 10.1076, "longitude": 76.3516},
        {"name": "Angamaly", "state": "Kerala", "latitude": 10.1960, "longitude": 76.3860},
        {"name": "Koratty", "state": "Kerala", "latitude": 10.2580, "longitude": 76.3530},
        {"name": "Chalakudy", "state": "Kerala", "latitude": 10.3031, "longitude": 76.3370},
        {"name": "Irinjalakuda", "state": "Kerala", "latitude": 10.3524, "longitude": 76.2087},
        {"name": "Kodakara", "state": "Kerala", "latitude": 10.3667, "longitude": 76.3000},
        {"name": "Pudukad", "state": "Kerala", "latitude": 10.4283, "longitude": 76.2730},
        {"name": "Amballur", "state": "Kerala", "latitude": 10.4350, "longitude": 76.2650},
        {"name": "Thrissur", "state": "Kerala", "latitude": 10.5276, "longitude": 76.2144},
        {"name": "Mannuthy", "state": "Kerala", "latitude": 10.5367, "longitude": 76.2678},
        {"name": "Vadakkencherry", "state": "Kerala", "latitude": 10.6022, "longitude": 76.5000},
        {"name": "Alathur", "state": "Kerala", "latitude": 10.6432, "longitude": 76.5447},
        {"name": "Palakkad", "state": "Kerala", "latitude": 10.7867, "longitude": 76.6548},
        {"name": "Walayar", "state": "Kerala", "latitude": 10.8407, "longitude": 76.8570},
        {"name": "Cherthala", "state": "Kerala", "latitude": 9.6845, "longitude": 76.3317},
        {"name": "Alappuzha (Alleppey)", "state": "Kerala", "latitude": 9.4981, "longitude": 76.3388},
        {"name": "Kottayam", "state": "Kerala", "latitude": 9.5916, "longitude": 76.5222},
        {"name": "Changanassery", "state": "Kerala", "latitude": 9.4447, "longitude": 76.5367},
        {"name": "Kollam (Quilon)", "state": "Kerala", "latitude": 8.8932, "longitude": 76.6141},
        {"name": "Thiruvananthapuram (Trivandrum)", "state": "Kerala", "latitude": 8.5241, "longitude": 76.9366},
        {"name": "Perumbavoor", "state": "Kerala", "latitude": 10.1070, "longitude": 76.4740},
        {"name": "Muvattupuzha", "state": "Kerala", "latitude": 9.9810, "longitude": 76.5780},
        {"name": "Thodupuzha", "state": "Kerala", "latitude": 9.8950, "longitude": 76.7180},
        {"name": "Athirappilly", "state": "Kerala", "latitude": 10.2860, "longitude": 76.5585},
        {"name": "Kozhikode (Calicut)", "state": "Kerala", "latitude": 11.2588, "longitude": 75.7804},
        {"name": "Malappuram", "state": "Kerala", "latitude": 11.0510, "longitude": 76.0711},
        {"name": "Kannur", "state": "Kerala", "latitude": 11.8745, "longitude": 75.3704},
        {"name": "Guruvayur", "state": "Kerala", "latitude": 10.5946, "longitude": 76.0396},
        # Tamil Nadu & Karnataka Corridors
        {"name": "Coimbatore", "state": "Tamil Nadu", "latitude": 11.0168, "longitude": 76.9558},
        {"name": "Tiruppur", "state": "Tamil Nadu", "latitude": 11.1085, "longitude": 77.3411},
        {"name": "Erode", "state": "Tamil Nadu", "latitude": 11.3410, "longitude": 77.7172},
        {"name": "Salem", "state": "Tamil Nadu", "latitude": 11.6643, "longitude": 78.1460},
        {"name": "Dharmapuri", "state": "Tamil Nadu", "latitude": 12.1211, "longitude": 78.1582},
        {"name": "Krishnagiri", "state": "Tamil Nadu", "latitude": 12.5266, "longitude": 78.2146},
        {"name": "Hosur", "state": "Tamil Nadu", "latitude": 12.7409, "longitude": 77.8253},
        {"name": "Bengaluru", "state": "Karnataka", "latitude": 12.9716, "longitude": 77.5946},
        {"name": "Bidadi", "state": "Karnataka", "latitude": 12.7981, "longitude": 77.3874},
        {"name": "Mandya", "state": "Karnataka", "latitude": 12.5242, "longitude": 76.8958},
        {"name": "Mysuru", "state": "Karnataka", "latitude": 12.2958, "longitude": 76.6394},
        {"name": "Chennai", "state": "Tamil Nadu", "latitude": 13.0827, "longitude": 80.2707},
        # Western Corridors
        {"name": "Mumbai", "state": "Maharashtra", "latitude": 19.0760, "longitude": 72.8777},
        {"name": "Pune", "state": "Maharashtra", "latitude": 18.5204, "longitude": 73.8567},
        {"name": "Hyderabad", "state": "Telangana", "latitude": 17.3850, "longitude": 78.4867},
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

    # 4. Multi-stop Routing: auto-select most optimal station or use user preference
    target_station_id = None
    if request.selected_station_id is not None and request.selected_station_id > 0:
        target_station_id = request.selected_station_id
    elif request.selected_station_id is None and request.auto_select_optimal and candidates:
        # Prioritize 'optimal' tier candidates with minimal detour, then 'acceptable'
        optimal_candidates = [c for c in candidates if c.get("tier") == "optimal"]
        if optimal_candidates:
            target_station_id = optimal_candidates[0]["id"]
        elif candidates:
            target_station_id = candidates[0]["id"]

    routed_via_station = None
    if target_station_id:
        station = db.query(Station).filter(Station.id == target_station_id).first()
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
                "summary": stop_route.get("summary", f"Via {station.name}"),
                "steps": stop_route.get("steps", []),
                "is_auto_selected": request.selected_station_id is None,
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
