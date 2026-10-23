"""Unit tests for StationNormalizer data sanitization and connector mapping."""

from backend.app.ingestion.normalizer import StationNormalizer


class TestStationNormalizer:

    def test_normalize_valid_station(self, sample_raw_data):
        raw_station = sample_raw_data[0]  # Tata Power Hub
        normalized = StationNormalizer.normalize_station(raw_station, h3_resolution=8)

        assert normalized is not None
        assert normalized.source == "openchargemap"
        assert normalized.source_id == 190001
        assert "Tata Power" in normalized.name
        assert normalized.operator_name == "Tata Power EZ Charge"
        assert normalized.latitude == 12.8399
        assert normalized.longitude == 77.6770
        assert len(normalized.h3_cell) == 15
        assert normalized.city == "Bengaluru"
        assert normalized.country_code == "IN"
        assert normalized.status_type == "Operational"
        assert normalized.is_operational is True
        assert len(normalized.connectors) == 2

        # Verify connectors
        ccs2_conn = next(c for c in normalized.connectors if c.connector_type == "CCS2")
        assert ccs2_conn.power_kw == 60.0
        assert ccs2_conn.current_type == "DC"
        assert ccs2_conn.quantity == 2

        type2_conn = next(c for c in normalized.connectors if c.connector_type == "Type 2")
        assert type2_conn.power_kw == 22.0
        assert type2_conn.current_type == "AC (Three Phase)"

    def test_normalize_malformed_missing_latitude(self, sample_raw_data):
        raw_malformed = sample_raw_data[4]  # Station 190005 (Missing latitude)
        normalized = StationNormalizer.normalize_station(raw_malformed)
        assert normalized is None

    def test_normalize_malformed_out_of_range_coordinates(self, sample_raw_data):
        raw_malformed = sample_raw_data[5]  # Station 190006 (Lat 999.0)
        normalized = StationNormalizer.normalize_station(raw_malformed)
        assert normalized is None

    def test_normalize_missing_id(self):
        raw = {"AddressInfo": {"Latitude": 12.9, "Longitude": 77.5}}
        assert StationNormalizer.normalize_station(raw) is None

    def test_normalize_missing_address_info(self):
        raw = {"ID": 99999}
        assert StationNormalizer.normalize_station(raw) is None

    def test_connector_mapping_standard_ids(self):
        assert StationNormalizer.map_connector_type(33, "CCS (Type 2)") == "CCS2"
        assert StationNormalizer.map_connector_type(25, "Type 2 (Socket Only)") == "Type 2"
        assert StationNormalizer.map_connector_type(2, "CHAdeMO") == "CHAdeMO"
        assert StationNormalizer.map_connector_type(1036, "GB/T (DC)") == "GB/T"
        assert StationNormalizer.map_connector_type(None, "Bharat DC-001 fast") == "Bharat DC-001"
        assert StationNormalizer.map_connector_type(None, "Bharat AC-001") == "Bharat AC-001"
        assert StationNormalizer.map_connector_type(None, "Domestic 3-pin Wall Socket") == "Standard Domestic Plug"

    def test_operational_status_mapping(self):
        label, is_op = StationNormalizer.map_operational_status(50)
        assert label == "Operational" and is_op is True

        label, is_op = StationNormalizer.map_operational_status(75)
        assert label == "Temporarily Unavailable" and is_op is False

        label, is_op = StationNormalizer.map_operational_status(100)
        assert label == "Planned" and is_op is False

        label, is_op = StationNormalizer.map_operational_status(None)
        assert label is None and is_op is None

    def test_parse_datetime(self):
        dt = StationNormalizer.parse_datetime("2026-10-20T10:30:00Z")
        assert dt is not None
        assert dt.year == 2026
        assert dt.month == 10
        assert dt.day == 20

        assert StationNormalizer.parse_datetime(None) is None
        assert StationNormalizer.parse_datetime("invalid-date-string") is None
