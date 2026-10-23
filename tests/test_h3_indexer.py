"""Unit tests for Uber H3 spatial indexing and coordinate validation."""

import pytest
import h3
from backend.app.ingestion.h3_indexer import H3SpatialIndexer


class TestH3SpatialIndexer:

    def test_coordinate_to_h3_valid(self):
        # Bangalore coordinates: (12.9716, 77.5946)
        cell = H3SpatialIndexer.coordinate_to_h3(12.9716, 77.5946, resolution=8)
        assert isinstance(cell, str)
        assert len(cell) == 15
        assert H3SpatialIndexer.is_valid_h3(cell) is True
        # Check resolution matches
        assert h3.get_resolution(cell) == 8

    def test_coordinate_to_h3_resolutions(self):
        # Verify resolution parameter support
        cell_res7 = H3SpatialIndexer.coordinate_to_h3(12.9716, 77.5946, resolution=7)
        cell_res9 = H3SpatialIndexer.coordinate_to_h3(12.9716, 77.5946, resolution=9)
        assert h3.get_resolution(cell_res7) == 7
        assert h3.get_resolution(cell_res9) == 9

    def test_is_valid_coordinate(self):
        assert H3SpatialIndexer.is_valid_coordinate(12.9716, 77.5946) is True
        assert H3SpatialIndexer.is_valid_coordinate(0.0, 77.5) is True
        assert H3SpatialIndexer.is_valid_coordinate(-89.9, 179.9) is True

        # Invalid coordinates
        assert H3SpatialIndexer.is_valid_coordinate(None, 77.5946) is False
        assert H3SpatialIndexer.is_valid_coordinate(12.9716, None) is False
        assert H3SpatialIndexer.is_valid_coordinate(91.0, 77.5946) is False
        assert H3SpatialIndexer.is_valid_coordinate(-95.0, 77.5946) is False
        assert H3SpatialIndexer.is_valid_coordinate(12.9716, 185.0) is False
        assert H3SpatialIndexer.is_valid_coordinate(12.9716, -190.0) is False
        assert H3SpatialIndexer.is_valid_coordinate(0.0, 0.0) is False  # Null Island rejection
        assert H3SpatialIndexer.is_valid_coordinate("invalid", "coords") is False

    def test_coordinate_to_h3_invalid_raises_value_error(self):
        with pytest.raises(ValueError, match="Invalid geographical coordinates"):
            H3SpatialIndexer.coordinate_to_h3(95.0, 77.0)

        with pytest.raises(ValueError, match="H3 resolution must be between 0 and 15"):
            H3SpatialIndexer.coordinate_to_h3(12.97, 77.59, resolution=20)

    def test_h3_to_coordinate(self):
        original_lat, original_lng = 12.9716, 77.5946
        cell = H3SpatialIndexer.coordinate_to_h3(original_lat, original_lng, resolution=8)
        centroid_lat, centroid_lng = H3SpatialIndexer.h3_to_coordinate(cell)

        # Centroid should be within ~500 meters of input point
        assert abs(original_lat - centroid_lat) < 0.01
        assert abs(original_lng - centroid_lng) < 0.01

    def test_h3_to_coordinate_invalid_raises(self):
        with pytest.raises(ValueError, match="Invalid H3 cell"):
            H3SpatialIndexer.h3_to_coordinate("not_a_valid_h3_cell")

    def test_get_h3_disk(self):
        cell = H3SpatialIndexer.coordinate_to_h3(12.9716, 77.5946, resolution=8)
        # Ring 1 has 7 cells (center + 6 neighbors)
        disk_1 = H3SpatialIndexer.get_h3_disk(cell, k=1)
        assert len(disk_1) == 7
        assert cell in disk_1

        # Ring 2 has 19 cells (1 + 6 + 12)
        disk_2 = H3SpatialIndexer.get_h3_disk(cell, k=2)
        assert len(disk_2) == 19
        assert disk_1.issubset(disk_2)

    def test_h3_to_polygon_coordinates(self):
        cell = H3SpatialIndexer.coordinate_to_h3(12.9716, 77.5946, resolution=8)
        polygon = H3SpatialIndexer.h3_to_polygon_coordinates(cell)
        assert isinstance(polygon, list)
        # H3 cell boundary has at least 6 vertices
        assert len(polygon) >= 6
        for lat, lng in polygon:
            assert -90.0 <= lat <= 90.0
            assert -180.0 <= lng <= 180.0
