"""Corridor discovery, detour calculations, battery SoC budgeting, and multi-stop route itinerary planning."""

import math
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.db.models import Station, StationConnector, CommunityCharger


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
        Scan commercial stations and community home chargers in database and evaluate
        corridor viability, detours, and SoC arrivals.
        """
        direct_dist = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)

        # Usable energy available in battery right now
        current_energy_kwh = battery_capacity_kwh * (current_soc / 100.0)
        reserve_energy_kwh = battery_capacity_kwh * (min_reserve_soc / 100.0)

        # Bounding box filter for quick candidate retrieval (+ 40km padding)
        min_lat = min(origin_lat, dest_lat) - 0.45
        max_lat = max(origin_lat, dest_lat) + 0.45
        min_lng = min(origin_lng, dest_lng) - 0.45
        max_lng = max(origin_lng, dest_lng) + 0.45

        # 1. Commercial stations from Open Charge Map
        stations = (
            db.query(Station)
            .filter(
                Station.latitude.between(min_lat, max_lat),
                Station.longitude.between(min_lng, max_lng),
            )
            .all()
        )

        # 2. Peer-to-peer residential community home chargers
        community_chargers = (
            db.query(CommunityCharger)
            .filter(
                CommunityCharger.latitude.between(min_lat, max_lat),
                CommunityCharger.longitude.between(min_lng, max_lng),
                CommunityCharger.availability_status != "offline",
            )
            .all()
        )

        candidates: List[Dict[str, Any]] = []

        # Process commercial public stations
        for st in stations:
            d_origin = haversine_distance(origin_lat, origin_lng, st.latitude, st.longitude)
            d_dest = haversine_distance(st.latitude, st.longitude, dest_lat, dest_lng)

            # Detour triangle formula: (Distance to Station + Distance from Station to Dest) - Direct Distance
            detour_km = round((d_origin + d_dest) - direct_dist, 2)

            if detour_km > max_detour_km:
                continue
            if d_origin > direct_dist + 35.0 or d_dest > direct_dist + 35.0:
                continue

            energy_needed_to_station = d_origin * cls.EV_CONSUMPTION_KWH_PER_KM
            remaining_kwh_at_station = current_energy_kwh - energy_needed_to_station
            arrival_soc = round(
                max(0.0, min(100.0, (remaining_kwh_at_station / battery_capacity_kwh) * 100.0)),
                1,
            )
            is_reachable = remaining_kwh_at_station >= (reserve_energy_kwh * 0.4)

            sorted_connectors = sorted(
                st.connectors,
                key=lambda c: (
                    1 if c.connector_type == "CCS2" else (2 if "Type 2" in c.connector_type else 3),
                    -(c.power_kw or 0.0),
                ),
            )

            max_power = max((c.power_kw for c in st.connectors if c.power_kw), default=22.0)
            has_fast_dc = any(c.connector_type == "CCS2" or (c.power_kw and c.power_kw >= 30) for c in st.connectors)

            if detour_km <= 5.0 and is_reachable and st.is_operational is not False and has_fast_dc:
                tier = "optimal"
                tier_color = "#10b981"
                tier_label = "Optimal Fast Charger"
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
                "operator_name": st.operator_name or "Independent CPO",
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
                "is_community_host": False,
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

        # Process community home chargers
        for c in community_chargers:
            d_origin = haversine_distance(origin_lat, origin_lng, c.latitude, c.longitude)
            d_dest = haversine_distance(c.latitude, c.longitude, dest_lat, dest_lng)
            detour_km = round((d_origin + d_dest) - direct_dist, 2)

            if detour_km > max_detour_km:
                continue
            if d_origin > direct_dist + 35.0 or d_dest > direct_dist + 35.0:
                continue

            energy_needed_to_station = d_origin * cls.EV_CONSUMPTION_KWH_PER_KM
            remaining_kwh_at_station = current_energy_kwh - energy_needed_to_station
            arrival_soc = round(
                max(0.0, min(100.0, (remaining_kwh_at_station / battery_capacity_kwh) * 100.0)),
                1,
            )
            is_reachable = remaining_kwh_at_station >= (reserve_energy_kwh * 0.4)

            max_power = c.power_kw or 7.4
            if detour_km <= 5.0 and is_reachable:
                tier = "optimal"
                tier_color = "#2563eb"  # Electric Blue
                tier_label = "Community Wallbox (Optimal)"
                tier_reason = f"Minimal {detour_km} km detour. Resident host {c.host_name} ({max_power:.1f}kW, ₹{c.price_per_kwh}/kWh)."
                rank = 0
            elif detour_km <= 15.0 and is_reachable:
                tier = "acceptable"
                tier_color = "#38bdf8"
                tier_label = "Community Wallbox (Detour)"
                tier_reason = f"{detour_km} km detour to resident host {c.host_name} ({max_power:.1f}kW)."
                rank = 1
            else:
                tier = "suboptimal"
                tier_color = "#ef4444"
                tier_label = "Not Worth It"
                tier_reason = "Excessive detour or unreachable."
                rank = 2

            candidates.append({
                "id": c.id + 100000,  # Offset ID to avoid collision with public station IDs
                "source_id": f"comm_{c.id}",
                "name": f"{c.title} (Host: {c.host_name})",
                "operator_name": f"Home Host: {c.host_name}",
                "latitude": c.latitude,
                "longitude": c.longitude,
                "h3_cell": c.h3_cell,
                "address": c.address or f"{c.city or ''}, Kerala",
                "city": c.city,
                "detour_km": detour_km,
                "detour_minutes": round((detour_km / 45.0) * 60.0, 1),
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
                "is_community_host": True,
                "trust_score": c.trust_score,
                "price_per_kwh": c.price_per_kwh,
                "queue_count": c.queue_count,
                "phone": c.phone,
                "connectors": [
                    {
                        "connector_type": c.connector_type,
                        "power_kw": c.power_kw,
                        "current_type": "AC",
                        "quantity": 1,
                    }
                ],
            })

        # Sort candidate list: optimal first, then acceptable, then lowest detour km
        candidates.sort(key=lambda x: (x["rank"], x["detour_km"], -x["max_power_kw"]))
        return candidates

    @classmethod
    def plan_multi_stop_itinerary(
        cls,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        direct_dist_km: float,
        current_soc: float,
        battery_capacity_kwh: float,
        min_reserve_soc: float,
        candidates: List[Dict[str, Any]],
        selected_station_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Simulate vehicle battery State of Charge (SoC) along the journey from A to B.
        Identifies if current charge is too low, or if multiple charging stops are required.
        """
        available_energy_kwh = battery_capacity_kwh * (current_soc / 100.0)
        available_range_km = round(available_energy_kwh / cls.EV_CONSUMPTION_KWH_PER_KM, 1)
        reserve_energy_kwh = battery_capacity_kwh * (min_reserve_soc / 100.0)
        usable_range_km = round(max(0.0, available_energy_kwh - reserve_energy_kwh) / cls.EV_CONSUMPTION_KWH_PER_KM, 1)

        energy_needed_kwh = direct_dist_km * cls.EV_CONSUMPTION_KWH_PER_KM
        direct_arrival_soc = round(max(0.0, ((available_energy_kwh - energy_needed_kwh) / battery_capacity_kwh) * 100.0), 1)
        is_direct_feasible = (available_energy_kwh - energy_needed_kwh) >= reserve_energy_kwh

        # 1. Critical Check: Is current percentage too low or below reserve?
        battery_warning = None
        min_station_dist = min((c["distance_from_origin_km"] for c in candidates), default=direct_dist_km)

        if not is_direct_feasible and len(candidates) > 0 and available_range_km < min_station_dist:
            battery_warning = {
                "is_critical": True,
                "title": "Critical Battery: Cannot Reach Nearest Charger",
                "message": (
                    f"Your current battery level ({current_soc:.0f}%) provides only ~{available_range_km:.0f} km of range. "
                    f"The nearest en-route charging station is {min_station_dist:.1f} km away. "
                    f"Your vehicle will deplete before reaching a charging point! Please recharge locally first."
                ),
                "available_range_km": available_range_km,
                "nearest_station_km": min_station_dist,
            }
        elif current_soc <= min_reserve_soc and not is_direct_feasible:
            battery_warning = {
                "is_critical": True,
                "title": f"Low Battery: {current_soc:.0f}% SoC (Below Reserve)",
                "message": (
                    f"Your vehicle battery ({current_soc:.0f}%) is at or below your safety reserve ({min_reserve_soc:.0f}%). "
                    f"Estimated range is ~{available_range_km:.0f} km. An immediate charging stop is scheduled."
                ),
                "available_range_km": available_range_km,
                "nearest_station_km": min_station_dist,
            }

        # 2. Sequential Itinerary & Stops Simulation
        stops: List[Dict[str, Any]] = []

        if selected_station_id is not None and selected_station_id > 0:
            # User explicitly chose a specific intermediate charging stop
            target_candidate = next((c for c in candidates if c["id"] == selected_station_id), None)
            if target_candidate:
                d1 = haversine_distance(origin_lat, origin_lng, target_candidate["latitude"], target_candidate["longitude"])
                d2 = haversine_distance(target_candidate["latitude"], target_candidate["longitude"], dest_lat, dest_lng)
                arr_soc = round(max(0.0, current_soc - ((d1 * cls.EV_CONSUMPTION_KWH_PER_KM / battery_capacity_kwh) * 100.0)), 1)
                dep_soc = 80.0 if arr_soc < 80.0 else min(95.0, arr_soc + 10.0)
                energy_charged = round(battery_capacity_kwh * ((dep_soc - arr_soc) / 100.0), 1)
                pwr = target_candidate.get("max_power_kw") or 25.0
                charge_time = round((energy_charged / max(pwr, 7.4)) * 60.0 * 1.15, 0)
                charge_time = max(15.0, min(120.0, charge_time))
                final_arr_soc = round(max(0.0, dep_soc - ((d2 * cls.EV_CONSUMPTION_KWH_PER_KM / battery_capacity_kwh) * 100.0)), 1)

                stops.append({
                    "stop_number": 1,
                    "station_id": target_candidate["id"],
                    "source_id": target_candidate.get("source_id"),
                    "name": target_candidate["name"],
                    "operator_name": target_candidate["operator_name"],
                    "latitude": target_candidate["latitude"],
                    "longitude": target_candidate["longitude"],
                    "city": target_candidate.get("city"),
                    "distance_from_prev_km": round(d1, 1),
                    "arrival_soc": arr_soc,
                    "departure_soc": dep_soc,
                    "charge_time_min": charge_time,
                    "energy_charged_kwh": energy_charged,
                    "max_power_kw": pwr,
                    "is_community_host": target_candidate.get("is_community_host", False),
                    "address": target_candidate.get("address", ""),
                })
                final_arrival_soc = final_arr_soc
            else:
                final_arrival_soc = direct_arrival_soc

        elif is_direct_feasible:
            # Trip is short enough that no charging stops are required
            stops = []
            final_arrival_soc = direct_arrival_soc

        else:
            # Multi-stop automated planning: journey distance exceeds current battery range
            curr_lat = origin_lat
            curr_lng = origin_lng
            curr_soc = current_soc

            for stop_idx in range(1, 6):
                dist_to_dest = haversine_distance(curr_lat, curr_lng, dest_lat, dest_lng)
                usable_dist = max(0.0, (battery_capacity_kwh * ((curr_soc - min_reserve_soc) / 100.0)) / cls.EV_CONSUMPTION_KWH_PER_KM)

                # Destination can be reached safely on remaining charge
                if dist_to_dest <= usable_dist:
                    final_arrival_soc = round(max(0.0, curr_soc - ((dist_to_dest * cls.EV_CONSUMPTION_KWH_PER_KM / battery_capacity_kwh) * 100.0)), 1)
                    break

                # Search forward along corridor for next optimal stop
                max_reach = (battery_capacity_kwh * (curr_soc / 100.0)) / cls.EV_CONSUMPTION_KWH_PER_KM

                valid_stops = []
                for c in candidates:
                    if any(s["station_id"] == c["id"] for s in stops):
                        continue
                    d_from_curr = haversine_distance(curr_lat, curr_lng, c["latitude"], c["longitude"])
                    d_to_dest = haversine_distance(c["latitude"], c["longitude"], dest_lat, dest_lng)

                    # Must be closer to destination and within vehicle battery reach
                    if d_from_curr <= max_reach and d_to_dest < dist_to_dest:
                        score = 100.0
                        if usable_dist > 0:
                            hop_ratio = d_from_curr / usable_dist
                            if 0.5 <= hop_ratio <= 1.0:
                                score += hop_ratio * 40.0
                            elif hop_ratio < 0.5:
                                score += hop_ratio * 10.0
                            else:
                                score -= (hop_ratio - 1.0) * 40.0

                        power = c.get("max_power_kw", 0)
                        if power >= 50:
                            score += 35
                        elif power >= 22:
                            score += 15

                        score -= c.get("detour_km", 0) * 1.5
                        valid_stops.append((score, d_from_curr, c))

                if not valid_stops:
                    # Fallback to any forward charger within reach
                    for c in candidates:
                        if any(s["station_id"] == c["id"] for s in stops):
                            continue
                        d_from_curr = haversine_distance(curr_lat, curr_lng, c["latitude"], c["longitude"])
                        d_to_dest = haversine_distance(c["latitude"], c["longitude"], dest_lat, dest_lng)
                        if d_from_curr <= max_reach and d_to_dest < dist_to_dest:
                            valid_stops.append((0, d_from_curr, c))

                if not valid_stops:
                    if not battery_warning:
                        battery_warning = {
                            "is_critical": True,
                            "title": "Charging Desert / Range Limit",
                            "message": (
                                f"After {len(stops)} stop(s), the distance to the next available charging station "
                                f"exceeds your battery range. Consider reducing cruising speed or checking local community chargers."
                            ),
                            "available_range_km": round(usable_dist, 1),
                            "nearest_station_km": round(dist_to_dest, 1),
                        }
                    final_arrival_soc = 0.0
                    break

                valid_stops.sort(key=lambda x: -x[0])
                chosen = valid_stops[0][2]
                d_chosen = valid_stops[0][1]

                arr_soc = round(max(0.0, curr_soc - ((d_chosen * cls.EV_CONSUMPTION_KWH_PER_KM / battery_capacity_kwh) * 100.0)), 1)
                dep_soc = 80.0 if arr_soc < 80.0 else min(95.0, arr_soc + 10.0)
                energy_charged = round(battery_capacity_kwh * ((dep_soc - arr_soc) / 100.0), 1)
                pwr = chosen.get("max_power_kw") or 25.0
                charge_time = round((energy_charged / max(pwr, 7.4)) * 60.0 * 1.15, 0)
                charge_time = max(15.0, min(120.0, charge_time))

                stops.append({
                    "stop_number": len(stops) + 1,
                    "station_id": chosen["id"],
                    "source_id": chosen.get("source_id"),
                    "name": chosen["name"],
                    "operator_name": chosen["operator_name"],
                    "latitude": chosen["latitude"],
                    "longitude": chosen["longitude"],
                    "city": chosen.get("city"),
                    "distance_from_prev_km": round(d_chosen, 1),
                    "arrival_soc": arr_soc,
                    "departure_soc": dep_soc,
                    "charge_time_min": charge_time,
                    "energy_charged_kwh": energy_charged,
                    "max_power_kw": pwr,
                    "is_community_host": chosen.get("is_community_host", False),
                    "address": chosen.get("address", ""),
                })

                curr_lat = chosen["latitude"]
                curr_lng = chosen["longitude"]
                curr_soc = dep_soc
            else:
                final_arrival_soc = round(max(0.0, curr_soc - ((haversine_distance(curr_lat, curr_lng, dest_lat, dest_lng) * cls.EV_CONSUMPTION_KWH_PER_KM / battery_capacity_kwh) * 100.0)), 1)

        total_charging_time_min = sum(s["charge_time_min"] for s in stops)

        return {
            "is_direct_feasible": is_direct_feasible,
            "direct_arrival_soc": direct_arrival_soc,
            "final_arrival_soc": final_arrival_soc,
            "total_stops_count": len(stops),
            "stops": stops,
            "total_charging_time_min": total_charging_time_min,
            "battery_warning": battery_warning,
            "available_range_km": available_range_km,
            "usable_range_km": usable_range_km,
        }
