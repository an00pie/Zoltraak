"""Open Charge Map payload normalization, validation, and connector mapping."""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.ingestion.h3_indexer import H3SpatialIndexer

logger = logging.getLogger(__name__)


class NormalizedConnector(BaseModel):
    """Cleaned representation of a charging station port / connector."""

    source_connector_id: Optional[int] = None
    connector_type: str
    power_kw: Optional[float] = None
    current_type: Optional[str] = None
    voltage: Optional[float] = None
    amperage: Optional[float] = None
    quantity: int = 1
    status: Optional[str] = None


class NormalizedStation(BaseModel):
    """Cleaned, validated, and H3-indexed charging station domain model."""

    source: str = "openchargemap"
    source_id: int
    name: str
    operator_name: Optional[str] = None
    operator_id: Optional[int] = None
    latitude: float
    longitude: float
    entrance_latitude: Optional[float] = None
    entrance_longitude: Optional[float] = None
    has_verified_entrance: bool = False
    h3_cell: str
    h3_resolution: int = 8
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    country_code: str = "IN"
    usage_type: Optional[str] = None
    usage_cost: Optional[str] = None
    status_type: Optional[str] = None
    is_operational: Optional[bool] = None
    number_of_points: Optional[int] = None
    data_quality_score: Optional[int] = None
    source_last_updated: Optional[datetime] = None
    connectors: List[NormalizedConnector] = Field(default_factory=list)


class StationNormalizer:
    """Parses raw Open Charge Map JSON dictionaries into structured NormalizedStation objects."""

    @staticmethod
    def map_connector_type(connection_type_id: Optional[int], title: Optional[str]) -> str:
        """Map OCM ConnectionTypeID and Title to standardized EV connector names."""
        clean_title = (title or "").lower().strip()

        # OCM standard IDs
        if connection_type_id == 33 or "ccs2" in clean_title or "ccs 2" in clean_title or "combo 2" in clean_title:
            return "CCS2"
        if connection_type_id == 32 or "ccs1" in clean_title or "combo 1" in clean_title:
            return "CCS1"
        if connection_type_id == 25 or "type 2" in clean_title or "mennekes" in clean_title:
            return "Type 2"
        if connection_type_id == 1 or "type 1" in clean_title or "j1772" in clean_title:
            return "Type 1"
        if connection_type_id == 2 or "chademo" in clean_title:
            return "CHAdeMO"
        if connection_type_id in (1036, 1037) or "gbt" in clean_title or "gb/t" in clean_title:
            return "GB/T"
        if "bharat dc" in clean_title or "dc-001" in clean_title:
            return "Bharat DC-001"
        if "bharat ac" in clean_title or "ac-001" in clean_title:
            return "Bharat AC-001"
        if "wall" in clean_title or "schuko" in clean_title:
            return "Standard Domestic Plug"

        return title.strip() if title and title.strip() else "Unknown"

    @staticmethod
    def map_current_type(current_type_id: Optional[int]) -> Optional[str]:
        """Map OCM CurrentTypeID to readable power category."""
        if current_type_id == 10:
            return "AC (Single Phase)"
        if current_type_id == 20:
            return "AC (Three Phase)"
        if current_type_id == 30:
            return "DC"
        return None

    @staticmethod
    def map_operational_status(status_type_id: Optional[int]) -> tuple[Optional[str], Optional[bool]]:
        """Map OCM StatusTypeID to human status label and operational boolean."""
        if status_type_id == 50:
            return "Operational", True
        if status_type_id in (75, 30):
            return "Temporarily Unavailable", False
        if status_type_id in (100, 150):
            return "Planned", False
        if status_type_id == 200:
            return "Removed", False
        if status_type_id is not None:
            return "Unknown", None
        return None, None

    @staticmethod
    def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
        """Safely parse ISO datetime string formats from OCM API."""
        if not dt_str:
            return None
        try:
            # Handle standard ISO and trailing 'Z'
            cleaned = dt_str.replace("Z", "+00:00")
            return datetime.fromisoformat(cleaned)
        except Exception:
            return None

    @classmethod
    def normalize_station(
        cls,
        raw_data: Dict[str, Any],
        h3_resolution: int = 8,
    ) -> Optional[NormalizedStation]:
        """
        Normalize a single OCM station dictionary.

        Returns:
            NormalizedStation if coordinates and essential fields are valid, else None.
        """
        if not isinstance(raw_data, dict):
            logger.warning("Skipping non-dictionary station record")
            return None

        source_id = raw_data.get("ID")
        if not source_id or not isinstance(source_id, int):
            logger.warning(f"Skipping record with missing or invalid ID: {source_id}")
            return None

        address_info = raw_data.get("AddressInfo")
        if not isinstance(address_info, dict):
            logger.warning(f"Station {source_id} missing AddressInfo object")
            return None

        # Coordinates validation
        raw_lat = address_info.get("Latitude")
        raw_lng = address_info.get("Longitude")

        if not H3SpatialIndexer.is_valid_coordinate(raw_lat, raw_lng):
            logger.warning(f"Station {source_id} rejected due to invalid coordinates: lat={raw_lat}, lng={raw_lng}")
            return None

        lat = float(raw_lat)
        lng = float(raw_lng)

        # Compute H3 cell index
        try:
            h3_cell = H3SpatialIndexer.coordinate_to_h3(lat, lng, resolution=h3_resolution)
        except Exception as e:
            logger.warning(f"Station {source_id} failed H3 calculation: {e}")
            return None

        # Station Title / Name
        name = address_info.get("Title") or raw_data.get("Title") or f"Charging Station #{source_id}"
        name = str(name).strip()

        # Operator Info
        operator_info = raw_data.get("OperatorInfo") or {}
        operator_name = operator_info.get("Title") or None
        operator_id = raw_data.get("OperatorID")

        # Address & Geographic fields
        address_line = address_info.get("AddressLine1") or address_info.get("AddressLine2")
        city = address_info.get("Town")
        state = address_info.get("StateOrProvince")
        postcode = address_info.get("Postcode")

        # Country code (OCM CountryID 106 is India, or string country code)
        country_code = "IN"
        if address_info.get("CountryID") == 106:
            country_code = "IN"
        elif address_info.get("ISOCode"):
            country_code = str(address_info.get("ISOCode")).upper()

        # Operational status
        status_type_id = raw_data.get("StatusTypeID")
        status_label, is_operational = cls.map_operational_status(status_type_id)

        # Source timestamps
        source_last_updated = cls.parse_datetime(
            raw_data.get("DateLastStatusUpdate") or raw_data.get("DateLastVerified")
        )

        # Connectors
        raw_connections = raw_data.get("Connections") or []
        connectors: List[NormalizedConnector] = []
        for conn in raw_connections:
            if not isinstance(conn, dict):
                continue
            conn_type_obj = conn.get("ConnectionType") or {}
            conn_type_id = conn.get("ConnectionTypeID") or conn_type_obj.get("ID")
            conn_title = conn_type_obj.get("Title") or conn.get("FormalName")

            normalized_type = cls.map_connector_type(conn_type_id, conn_title)
            power_kw = conn.get("PowerKW")
            if power_kw is not None:
                try:
                    power_kw = float(power_kw)
                except (ValueError, TypeError):
                    power_kw = None

            current_type = cls.map_current_type(conn.get("CurrentTypeID"))
            quantity = conn.get("Quantity") or 1
            try:
                quantity = int(quantity)
            except (ValueError, TypeError):
                quantity = 1

            connectors.append(
                NormalizedConnector(
                    source_connector_id=conn.get("ID"),
                    connector_type=normalized_type,
                    power_kw=power_kw,
                    current_type=current_type,
                    voltage=float(conn["Voltage"]) if conn.get("Voltage") else None,
                    amperage=float(conn["Amps"]) if conn.get("Amps") else None,
                    quantity=quantity,
                    status="Operational" if conn.get("StatusTypeID") == 50 else None,
                )
            )

        return NormalizedStation(
            source="openchargemap",
            source_id=source_id,
            name=name,
            operator_name=operator_name,
            operator_id=operator_id,
            latitude=lat,
            longitude=lng,
            entrance_latitude=None,
            entrance_longitude=None,
            has_verified_entrance=False,
            h3_cell=h3_cell,
            h3_resolution=h3_resolution,
            address=address_line.strip() if address_line else None,
            city=city.strip() if city else None,
            state=state.strip() if state else None,
            postcode=str(postcode).strip() if postcode else None,
            country_code=country_code,
            usage_type=str(raw_data.get("UsageTypeID")) if raw_data.get("UsageTypeID") else None,
            usage_cost=raw_data.get("UsageCost"),
            status_type=status_label,
            is_operational=is_operational,
            number_of_points=raw_data.get("NumberOfPoints"),
            data_quality_score=raw_data.get("DataQualityLevel"),
            source_last_updated=source_last_updated,
            connectors=connectors,
        )
