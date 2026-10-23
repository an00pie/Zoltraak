"""Corridor discovery, detour calculations, battery SoC budgeting, and tier classification."""

import math
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.db.models import Station, StationConnector


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class CorridorAnalyzer:
    """Finds and ranks charging stations along a highway or urban driving corridor."""

    EV_CONSUMPTION_KWH_PER_KM = 0.15  # Nominal 150 Wh/km for standard passenger EVs

    @classmethod
    def evaluate_corridor_candidates(
        cls,
        db: Session,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        current_soc: float = 40.0,
        battery_capacity_kwh: float = 40.5,
        min_reserve_soc: float = 15.0,
        max_detour_km: float = 35.0,
    ) -> List[Dict[str, Any]]:
        """
        Scan stations in database and evaluate corridor viability, detours, and SoC arrivals.
        """
        direct_dist = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)

        # Usable energy available in battery right now
        current_energy_kwh = battery_capacity_kwh * (current_soc / 100.0)
        reserve_energy_kwh = battery_capacity_kwh * (min_reserve_soc / 100.0)

        # Bounding box filter for quick candidate retrieval (+ 40km padding)
        min_lat = min(origin_lat, dest_lat) - 0.4
        max_lat = max(origin_lat, dest_lat) + 0.4
        min_lng = min(origin_lng, dest_lng) - 0.4
        max_lng = max(origin_lng, dest_lng) + 0.4

        stations = (
            db.query(Station)
            .filter(
                Station.latitude.between(min_lat, max_lat),
                Station.longitude.between(min_lng, max_lng),
            )
            .all()
        )

        candidates: List[Dict[str, Any]] = []

        for st in stations:
            d_origin = haversine_distance(origin_lat, origin_lng, st.latitude, st.longitude)
            d_dest = haversine_distance(st.latitude, st.longitude, dest_lat, dest_lng)

            # Detour triangle formula: (Distance to Station + Distance from Station to Dest) - Direct Distance
            detour_km = round((d_origin + d_dest) - direct_dist, 2)

            # Enroute filter: Ignore stations far past destination or far behind origin
            if detour_km > max_detour_km:
                continue
            if d_origin > direct_dist + 30.0 or d_dest > direct_dist + 30.0:
                continue

            # Energy consumption calculation to reach this station
            energy_needed_to_station = d_origin * cls.EV_CONSUMPTION_KWH_PER_KM
            remaining_kwh_at_station = current_energy_kwh - energy_needed_to_station
            arrival_soc = round(
                max(0.0, min(100.0, (remaining_kwh_at_station / battery_capacity_kwh) * 100.0)),
                1,
            )
            is_reachable = remaining_kwh_at_station >= (reserve_energy_kwh * 0.5)

            # Sort station connectors by speed and suitability
            sorted_connectors = sorted(
                st.connectors,
                key=lambda c: (
                    1 if c.connector_type == "CCS2" else (2 if "Type 2" in c.connector_type else 3),
                    -(c.power_kw or 0.0),
                ),
            )

            max_power = max((c.power_kw for c in st.connectors if c.power_kw), default=0.0)
            has_fast_dc = any(c.connector_type == "CCS2" or (c.power_kw and c.power_kw >= 30) for c in st.connectors)

            # Tier classification matching user specification:
            # 🟢 Optimal: <= 5km detour, reachable, fast/operational
            # 🟡 Acceptable: 5km - 15km detour ("a bit far but aight")
            # 🔴 Suboptimal: > 15km detour ("not worth going for") or unreachable
            if detour_km <= 5.0 and is_reachable and st.is_operational is not False and has_fast_dc:
                tier = "optimal"
                tier_color = "#10b981"
                tier_label = "Optimal"
                tier_reason = f"Minimal {detour_km} km detour on highway corridor. {max_power:.0f}kW fast charger."
                rank = 0
            elif detour_km <= 15.0 and is_reachable:
                tier = "acceptable"
                tier_color = "#f59e0b"
                tier_label = "Acceptable (Detour)"
                tier_reason = f"{detour_km} km detour. Suitable backup charging stop."
                rank = 1
            else:
                tier = "suboptimal"
                tier_color = "#ef4444"
                tier_label = "Not Worth It"
                if not is_reachable:
                    tier_reason = f"Unreachable: battery depletes before arrival ({arrival_soc}% SoC)."
                elif detour_km > 15.0:
                    tier_reason = f"Suboptimal: excessive {detour_km} km detour off highway."
                else:
                    tier_reason = "Slow charging speeds or unverified status."
                rank = 2

            candidates.append({
                "id": st.id,
                "source_id": st.source_id,
                "name": st.name,
                "operator_name": st.operator_name or "Independent",
                "latitude": st.latitude,
                "longitude": st.longitude,
                "h3_cell": st.h3_cell,
                "address": st.address or f"{st.city or ''}, {st.state or ''}",
                "city": st.city,
                "detour_km": detour_km,
                "detour_minutes": round((detour_km / 50.0) * 60.0, 1),
                "distance_from_origin_km": round(d_origin, 1),
                "distance_to_dest_km": round(d_dest, 1),
                "arrival_soc": arrival_soc,
                "is_reachable": is_reachable,
                "tier": tier,
                "tier_color": tier_color,
                "tier_label": tier_label,
                "tier_reason": tier_reason,
                "max_power_kw": max_power,
                "rank": rank,
                "connectors": [
                    {
                        "connector_type": c.connector_type,
                        "power_kw": c.power_kw,
                        "current_type": c.current_type,
                        "quantity": c.quantity,
                    }
                    for c in sorted_connectors
                ],
            })

        # Sort candidate list: optimal first, then acceptable, then by lowest detour km
        candidates.sort(key=lambda x: (x["rank"], x["detour_km"], -x["max_power_kw"]))
        return candidates
