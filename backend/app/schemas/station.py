"""Pydantic schemas for station read responses and queries."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ConnectorRead(BaseModel):
    id: int
    source_connector_id: Optional[int] = None
    connector_type: str
    power_kw: Optional[float] = None
    current_type: Optional[str] = None
    voltage: Optional[float] = None
    amperage: Optional[float] = None
    quantity: int = 1
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StationRead(BaseModel):
    id: int
    source: str
    source_id: int
    name: str
    operator_name: Optional[str] = None
    operator_id: Optional[int] = None
    latitude: float
    longitude: float
    entrance_latitude: Optional[float] = None
    entrance_longitude: Optional[float] = None
    has_verified_entrance: bool
    h3_cell: str
    h3_resolution: int
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    country_code: str
    usage_type: Optional[str] = None
    usage_cost: Optional[str] = None
    status_type: Optional[str] = None
    is_operational: Optional[bool] = None
    number_of_points: Optional[int] = None
    data_quality_score: Optional[int] = None
    source_last_updated: Optional[datetime] = None
    ingested_at: datetime
    updated_at: datetime
    connectors: List[ConnectorRead] = []

    model_config = ConfigDict(from_attributes=True)


class StationListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[StationRead]
