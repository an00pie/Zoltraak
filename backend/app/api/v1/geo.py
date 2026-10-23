"""OpenStreetMap (OSM) Nominatim forward and reverse geocoding endpoints."""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/geo/search", tags=["Geocoding"])
def search_places(
    q: str = Query(..., min_length=2, description="Place search query (e.g. city, landmark)"),
    country_code: str = Query("in", description="Limit search to country (default: in)"),
    limit: int = Query(5, ge=1, le=10),
):
    """
    Search places and cities using OpenStreetMap Nominatim engine.
    Returns geographic coordinates and bounding boxes.
    """
    url = f"{settings.OSM_NOMINATIM_BASE_URL}/search"
    params = {
        "q": q,
        "format": "json",
        "countrycodes": country_code,
        "limit": limit,
        "addressdetails": 1,
    }
    headers = {
        "User-Agent": "Zoltraak-EV-RoutePlanner/0.1.0 (contact: builder@zoltraak.local)",
        "Accept-Language": "en",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            results = resp.json()

            formatted = []
            for item in results:
                formatted.append({
                    "place_id": item.get("place_id"),
                    "display_name": item.get("display_name"),
                    "name": item.get("name"),
                    "latitude": float(item.get("lat")),
                    "longitude": float(item.get("lon")),
                    "type": item.get("type"),
                    "bounding_box": item.get("boundingbox"),
                })
            return formatted

    except Exception as e:
        logger.warning(f"OSM Nominatim search error for '{q}': {e}")
        # Return fallback for common Indian cities if OSM public rate limits hit
        common_cities = {
            "bangalore": {"name": "Bengaluru, Karnataka", "latitude": 12.9716, "longitude": 77.5946},
            "bengaluru": {"name": "Bengaluru, Karnataka", "latitude": 12.9716, "longitude": 77.5946},
            "mysore": {"name": "Mysuru, Karnataka", "latitude": 12.2958, "longitude": 76.6394},
            "mysuru": {"name": "Mysuru, Karnataka", "latitude": 12.2958, "longitude": 76.6394},
            "chennai": {"name": "Chennai, Tamil Nadu", "latitude": 13.0827, "longitude": 80.2707},
            "mumbai": {"name": "Mumbai, Maharashtra", "latitude": 19.0760, "longitude": 72.8777},
            "delhi": {"name": "New Delhi, Delhi", "latitude": 28.6139, "longitude": 77.2090},
            "kochi": {"name": "Kochi, Kerala", "latitude": 9.9312, "longitude": 76.2673},
            "palakkad": {"name": "Palakkad, Kerala", "latitude": 10.7867, "longitude": 76.6548},
            "ahmedabad": {"name": "Ahmedabad, Gujarat", "latitude": 23.0225, "longitude": 72.5714},
        }
        q_lower = q.lower().strip()
        matched = [
            {"place_id": idx, "display_name": v["name"], "name": v["name"], "latitude": v["latitude"], "longitude": v["longitude"], "type": "city"}
            for idx, (k, v) in enumerate(common_cities.items())
            if k in q_lower or q_lower in k
        ]
        return matched


@router.get("/geo/reverse", tags=["Geocoding"])
def reverse_geocode(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
):
    """
    Reverse geocode coordinates to street address and city name using OpenStreetMap.
    """
    url = f"{settings.OSM_NOMINATIM_BASE_URL}/reverse"
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "json",
    }
    headers = {
        "User-Agent": "Zoltraak-EV-RoutePlanner/0.1.0 (contact: builder@zoltraak.local)",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            address = data.get("address", {})
            return {
                "display_name": data.get("display_name"),
                "road": address.get("road"),
                "city": address.get("city") or address.get("town") or address.get("suburb"),
                "state": address.get("state"),
                "postcode": address.get("postcode"),
                "country": address.get("country"),
            }
    except Exception as e:
        logger.warning(f"OSM Nominatim reverse error for ({latitude}, {longitude}): {e}")
        return {
            "display_name": f"{latitude:.4f}, {longitude:.4f}",
            "city": "Unknown",
        }
