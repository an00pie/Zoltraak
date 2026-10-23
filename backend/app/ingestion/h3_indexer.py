"""Uber H3 spatial indexing utilities and coordinate validation."""

from typing import List, Optional, Set, Tuple
import h3
from backend.app.core.config import settings


class H3SpatialIndexer:
    """Provides Uber H3 discrete global grid spatial indexing for EV charging stations."""

    @staticmethod
    def is_valid_coordinate(latitude: Optional[float], longitude: Optional[float]) -> bool:
        """Validate that latitude and longitude exist and are within WGS84 physical boundaries."""
        if latitude is None or longitude is None:
            return False
        try:
            lat = float(latitude)
            lng = float(longitude)
        except (ValueError, TypeError):
            return False

        if not (-90.0 <= lat <= 90.0):
            return False
        if not (-180.0 <= lng <= 180.0):
            return False
        # (0, 0) is null island / often indicative of bad geocoding
        if lat == 0.0 and lng == 0.0:
            return False

        return True

    @classmethod
    def coordinate_to_h3(
        cls,
        latitude: float,
        longitude: float,
        resolution: Optional[int] = None,
    ) -> str:
        """
        Convert WGS84 latitude/longitude to an H3 cell index string.

        Args:
            latitude: WGS84 latitude (-90 to 90)
            longitude: WGS84 longitude (-180 to 180)
            resolution: H3 resolution level (0-15). Defaults to settings.H3_DEFAULT_RESOLUTION (8).

        Returns:
            Hexadecimal string representing the H3 cell ID.

        Raises:
            ValueError: If coordinates are invalid or out of bounds.
        """
        if not cls.is_valid_coordinate(latitude, longitude):
            raise ValueError(f"Invalid geographical coordinates: lat={latitude}, lng={longitude}")

        res = resolution if resolution is not None else settings.H3_DEFAULT_RESOLUTION
        if not (0 <= res <= 15):
            raise ValueError(f"H3 resolution must be between 0 and 15, received: {res}")

        # h3 v4 API: latlng_to_cell
        return h3.latlng_to_cell(float(latitude), float(longitude), res)

    @staticmethod
    def is_valid_h3(h3_cell: str) -> bool:
        """Check whether a given string is a valid H3 cell index."""
        if not h3_cell or not isinstance(h3_cell, str):
            return False
        try:
            return h3.is_valid_cell(h3_cell)
        except Exception:
            return False

    @staticmethod
    def h3_to_coordinate(h3_cell: str) -> Tuple[float, float]:
        """
        Convert an H3 cell index back to its centroid (latitude, longitude).

        Returns:
            Tuple of (latitude, longitude).
        """
        if not h3.is_valid_cell(h3_cell):
            raise ValueError(f"Invalid H3 cell index: {h3_cell}")
        lat, lng = h3.cell_to_latlng(h3_cell)
        return float(lat), float(lng)

    @staticmethod
    def get_h3_disk(h3_cell: str, k: int = 1) -> Set[str]:
        """
        Return all H3 cells within distance k of the origin cell (k-ring disk).
        Used for efficient corridor and radius neighbor search.
        """
        if not h3.is_valid_cell(h3_cell):
            raise ValueError(f"Invalid H3 cell index: {h3_cell}")
        return set(h3.grid_disk(h3_cell, k))

    @staticmethod
    def h3_to_polygon_coordinates(h3_cell: str) -> List[Tuple[float, float]]:
        """
        Retrieve boundary vertices for the H3 cell.
        Useful for rendering GeoJSON hexagon overlays on MapLibre.
        """
        if not h3.is_valid_cell(h3_cell):
            raise ValueError(f"Invalid H3 cell index: {h3_cell}")
        # Returns sequence of (lat, lng) tuples
        boundary = h3.cell_to_boundary(h3_cell)
        return [(float(lat), float(lng)) for lat, lng in boundary]
