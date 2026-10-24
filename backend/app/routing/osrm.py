"""OSRM routing client providing driving polyline geometry, distances, durations, and GPS turn-by-turn maneuvers."""

import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

logger = logging.getLogger(__name__)


class OSRMClient:
    """Client for Project OSRM driving engine."""

    def __init__(self, base_url: str = "https://router.project-osrm.org", timeout: float = 15.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    @staticmethod
    def _parse_steps(route: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse OSRM maneuver steps into human-readable turn-by-turn GPS instructions."""
        steps: List[Dict[str, Any]] = []
        for leg in route.get("legs", []):
            for s in leg.get("steps", []):
                maneuver = s.get("maneuver", {})
                name = s.get("name") or s.get("ref") or "Highway"
                m_type = maneuver.get("type", "turn")
                m_modifier = maneuver.get("modifier", "")

                if m_type == "depart":
                    instruction = f"Start journey and head on {name}"
                elif m_type == "arrive":
                    instruction = f"Arrive at destination"
                elif m_type in ("fork", "roundabout", "rotary"):
                    instruction = f"Take {m_type} onto {name}"
                elif m_modifier:
                    instruction = f"Turn {m_modifier.replace('_', ' ')} onto {name}"
                else:
                    instruction = f"Continue straight onto {name}"

                dist_m = s.get("distance", 0)
                dur_s = s.get("duration", 0)

                steps.append({
                    "instruction": instruction,
                    "name": name,
                    "distance_km": round(dist_m / 1000.0, 2),
                    "duration_min": round(dur_s / 60.0, 1),
                    "type": m_type,
                    "modifier": m_modifier,
                })
        return steps

    def get_route(
        self,
        origin_lng: float,
        origin_lat: float,
        dest_lng: float,
        dest_lat: float,
    ) -> Dict[str, Any]:
        """
        Calculate direct driving route between origin and destination.

        Returns:
            Dict containing distance_km, duration_min, geometry coordinates, summary, and GPS steps.
        """
        coords_str = f"{origin_lng:.6f},{origin_lat:.6f};{dest_lng:.6f},{dest_lat:.6f}"
        url = f"{self.base_url}/route/v1/driving/{coords_str}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    summary = route.get("legs", [{}])[0].get("summary", "") or "Highway Corridor"
                    steps = self._parse_steps(route)

                    return {
                        "status": "success",
                        "distance_km": round(route["distance"] / 1000.0, 2),
                        "duration_min": round(route["duration"] / 60.0, 1),
                        "coordinates": route["geometry"]["coordinates"],
                        "summary": summary,
                        "steps": steps,
                    }
        except Exception as e:
            logger.warning(f"OSM/OSRM routing query failed ({e}), generating synthetic highway geometry fallback.")

        # Resilient fallback: synthetic highway points connecting origin and destination
        return self._generate_fallback_route(
            origin_lng, origin_lat, dest_lng, dest_lat
        )

    def get_route_via_waypoints(
        self,
        waypoints: List[Tuple[float, float]],
    ) -> Dict[str, Any]:
        """
        Calculate driving route passing through multiple intermediate coordinates:
        waypoints = [(orig_lng, orig_lat), (stop1_lng, stop1_lat), ..., (dest_lng, dest_lat)]
        """
        if len(waypoints) < 2:
            raise ValueError("At least 2 waypoints required")
        if len(waypoints) == 2:
            return self.get_route(waypoints[0][0], waypoints[0][1], waypoints[1][0], waypoints[1][1])

        coords_str = ";".join(f"{lng:.6f},{lat:.6f}" for lng, lat in waypoints)
        url = f"{self.base_url}/route/v1/driving/{coords_str}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    steps = self._parse_steps(route)

                    return {
                        "status": "success",
                        "distance_km": round(route["distance"] / 1000.0, 2),
                        "duration_min": round(route["duration"] / 60.0, 1),
                        "coordinates": route["geometry"]["coordinates"],
                        "summary": f"Multi-stop Route ({len(waypoints) - 2} charging stops)",
                        "steps": steps,
                    }
        except Exception as e:
            logger.warning(f"OSRM multi-stop routing query failed ({e}), generating composite fallback.")

        # Fallback composite across legs
        total_dist = 0.0
        total_dur = 0.0
        combined_coords = []
        combined_steps = []
        for i in range(len(waypoints) - 1):
            leg = self._generate_fallback_route(
                waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1]
            )
            total_dist += leg["distance_km"]
            total_dur += leg["duration_min"]
            if i == 0:
                combined_coords.extend(leg["coordinates"])
            else:
                combined_coords.extend(leg["coordinates"][1:])
            combined_steps.append({
                "instruction": f"Leg {i + 1}: Travel to waypoint {i + 1}",
                "distance_km": leg["distance_km"],
                "duration_min": leg["duration_min"],
            })

        return {
            "status": "fallback",
            "distance_km": round(total_dist, 2),
            "duration_min": round(total_dur, 1),
            "coordinates": combined_coords,
            "summary": f"Interpolated Multi-stop Route ({len(waypoints) - 2} stops)",
            "steps": combined_steps,
        }

    def get_route_via_waypoint(
        self,
        origin_lng: float,
        origin_lat: float,
        stop_lng: float,
        stop_lat: float,
        dest_lng: float,
        dest_lat: float,
    ) -> Dict[str, Any]:
        """
        Calculate driving route passing through an intermediate charging station stop:
        Origin -> Charging Station -> Destination.
        """
        return self.get_route_via_waypoints([
            (origin_lng, origin_lat),
            (stop_lng, stop_lat),
            (dest_lng, dest_lat),
        ])

    @staticmethod
    def _generate_fallback_route(
        lng1: float,
        lat1: float,
        lng2: float,
        lat2: float,
    ) -> Dict[str, Any]:
        """Generate interpolated line coordinates and estimated distance if OSRM is offline."""
        import math

        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lng2 - lng1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2.0) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = round(R * c * 1.25, 2)
        duration_min = round((distance_km / 65.0) * 60.0, 1)

        points: List[List[float]] = []
        steps = 25
        for i in range(steps + 1):
            t = i / steps
            interp_lng = lng1 + (lng2 - lng1) * t
            interp_lat = lat1 + (lat2 - lat1) * t
            points.append([round(interp_lng, 6), round(interp_lat, 6)])

        return {
            "status": "fallback",
            "distance_km": distance_km,
            "duration_min": duration_min,
            "coordinates": points,
            "summary": "Direct Highway Corridor",
            "steps": [
                {"instruction": "Depart along Highway", "distance_km": distance_km, "duration_min": duration_min},
                {"instruction": "Arrive at destination", "distance_km": 0.0, "duration_min": 0.0},
            ],
        }
