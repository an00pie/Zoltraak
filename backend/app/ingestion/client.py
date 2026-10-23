"""HTTP client for querying Open Charge Map API v3 with offline fixture fallback."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class OpenChargeMapClient:
    """Interfaces with Open Charge Map API v3, respecting rate limits and API keys."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.api_key = api_key or settings.OCM_API_KEY
        self.base_url = (base_url or settings.OCM_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.OCM_TIMEOUT_SECONDS

    def fetch_live_stations(
        self,
        country_code: str = "IN",
        max_results: int = 100,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        distance_km: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query Open Charge Map API for charging stations.

        Args:
            country_code: Two-letter ISO country code (e.g., 'IN' for India)
            max_results: Maximum records to return
            latitude: Optional latitude for radial search
            longitude: Optional longitude for radial search
            distance_km: Optional radial distance in kilometers

        Returns:
            List of raw station dictionaries from OCM API.

        Raises:
            PermissionError: If API key is missing or rejected (403).
            RuntimeError: If request fails due to network or rate limiting.
        """
        url = f"{self.base_url}/poi"
        params: Dict[str, Any] = {
            "countrycode": country_code,
            "maxresults": max_results,
            "compact": "true",
            "verbose": "false",
        }

        if latitude is not None and longitude is not None:
            params["latitude"] = latitude
            params["longitude"] = longitude
            if distance_km:
                params["distance"] = distance_km
                params["distanceunit"] = "KM"

        headers = {
            "User-Agent": "Zoltraak-EV-RoutePlanner/0.1.0",
            "Accept": "application/json",
        }

        if self.api_key:
            params["key"] = self.api_key
            headers["X-API-Key"] = self.api_key

        logger.info(f"Fetching OCM stations: country={country_code}, maxresults={max_results}")

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, params=params, headers=headers)

                if response.status_code == 403:
                    raise PermissionError(
                        "Open Charge Map returned 403 Forbidden. "
                        "Please provide a valid OCM API key via OCM_API_KEY environment variable. "
                        "You can register for a free key at: https://openchargemap.io/site/develop/api"
                    )

                response.raise_for_status()
                data = response.json()
                if not isinstance(data, list):
                    logger.warning(f"Unexpected response format from OCM API: {type(data)}")
                    return []
                return data

        except httpx.HTTPStatusError as e:
            logger.error(f"OCM API HTTP error: {e.response.status_code} - {e.response.text[:200]}")
            raise RuntimeError(f"OCM API request failed: HTTP {e.response.status_code}") from e
        except httpx.RequestError as e:
            logger.error(f"OCM API network connection error: {e}")
            raise RuntimeError(f"OCM API network connection failed: {e}") from e

    @staticmethod
    def load_fixture(fixture_path: Path) -> List[Dict[str, Any]]:
        """Load offline JSON fixture data for testing and offline development."""
        if not fixture_path.exists():
            raise FileNotFoundError(f"Fixture file not found at: {fixture_path}")

        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            raise ValueError(f"Fixture data must be a JSON array, got: {type(data)}")

        logger.info(f"Loaded {len(data)} stations from offline fixture: {fixture_path}")
        return data
