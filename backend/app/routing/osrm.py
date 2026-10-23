"""OSRM routing client providing driving polyline geometry, distances, and durations."""

import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

logger = logging.getLogger(__name__)


class OSRMClient:
    """Client for Project OSRM driving engine."""

    def __init__(self, base_url: str = "https://router.project-osrm.org", timeout: float = 8.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

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
            Dict containing distance_km, duration_min, geometry (GeoJSON LineString coordinates), and steps.
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
                    return {
                        "status": "success",
                        "distance_km": round(route["distance"] / 1000.0, 2),
                        "duration_min": round(route["duration"] / 60.0, 1),
                        "coordinates": route["geometry"]["coordinates"],
                        "summary": route.get("legs", [{}])[0].get("summary", ""),
                    }
        except Exception as e:
            logger.warning(f"OSM/OSRM routing query failed ({e}), generating synthetic highway geometry fallback.")

        # Resilient fallback: synthetic highway points connecting origin and destination
        return self._generate_fallback_route(
            origin_lng, origin_lat, dest_lng, dest_lat
        )

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
        coords_str = (
            f"{origin_lng:.6f},{origin_lat:.6f};"
            f"{stop_lng:.6f},{stop_lat:.6f};"
            f"{dest_lng:.6f},{dest_lat:.6f}"
        )
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
                    return {
                        "status": "success",
                        "distance_km": round(route["distance"] / 1000.0, 2),
                        "duration_min": round(route["duration"] / 60.0, 1),
                        "coordinates": route["geometry"]["coordinates"],
                    }
        except Exception as e:
            logger.warning(f"OSRM multi-stop routing query failed ({e}), generating composite fallback.")

        # Fallback composite
        leg1 = self._generate_fallback_route(origin_lng, origin_lat, stop_lng, stop_lat)
        leg2 = self._generate_fallback_route(stop_lng, stop_lat, dest_lng, dest_lat)
        return {
            "status": "fallback",
            "distance_km": round(leg1["distance_km"] + leg2["distance_km"], 2),
            "duration_min": round(leg1["duration_min"] + leg2["duration_min"], 1),
            "coordinates": leg1["coordinates"] + leg2["coordinates"][1:],
        }

    @staticmethod
    def _generate_fallback_route(
        lng1: float,
        lat1: float,
        lng2: float,
        lat2: float,
    ) -> Dict[str, Any]:
        """Generate interpolated line coordinates and estimated distance if OSRM is offline."""
        import math

        # Haversine distance
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
        distance_km = round(R * c * 1.25, 2)  # road winding factor 1.25x
        duration_min = round((distance_km / 65.0) * 60.0, 1)  # avg 65 km/h

        # 10 interpolated steps
        points: List[List[float]] = []
        steps = 15
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
            "summary": "Interpolated corridor",
        }
