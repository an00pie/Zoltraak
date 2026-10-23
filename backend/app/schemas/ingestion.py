"""Pydantic schemas for data ingestion requests and run tracking."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class IngestionRunRead(BaseModel):
    id: int
    source: str
    country_code: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    records_fetched: int
    records_inserted: int
    records_updated: int
    records_skipped: int
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IngestionTriggerRequest(BaseModel):
    country_code: str = "IN"
    max_results: int = 100
    use_fixture: bool = False
    fixture_path: Optional[str] = None
