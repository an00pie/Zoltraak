"""Data ingestion pipeline orchestrating OCM fetch, normalization, H3 indexing, and DB upsert."""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.models import Station, StationConnector, IngestionRun
from backend.app.ingestion.client import OpenChargeMapClient
from backend.app.ingestion.normalizer import StationNormalizer, NormalizedStation

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """Orchestrates end-to-end ingestion of EV charging stations into the persistent database."""

    def __init__(self, db: Session, client: Optional[OpenChargeMapClient] = None):
        self.db = db
        self.client = client or OpenChargeMapClient()

    def process_records(
        self,
        raw_records: List[Dict[str, Any]],
        country_code: str = "IN",
        h3_resolution: Optional[int] = None,
    ) -> IngestionRun:
        """
        Normalize, index, and upsert a list of raw station records idempotently.

        Args:
            raw_records: List of raw JSON station objects.
            country_code: ISO country code being processed.
            h3_resolution: Uber H3 resolution (defaults to settings.H3_DEFAULT_RESOLUTION).

        Returns:
            Completed IngestionRun entity.
        """
        resolution = h3_resolution or settings.H3_DEFAULT_RESOLUTION
        run = IngestionRun(
            source="openchargemap",
            country_code=country_code,
            started_at=datetime.utcnow(),
            status="in_progress",
            records_fetched=len(raw_records),
            records_inserted=0,
            records_updated=0,
            records_skipped=0,
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        try:
            for raw in raw_records:
                normalized = StationNormalizer.normalize_station(raw, h3_resolution=resolution)

                if normalized is None:
                    run.records_skipped += 1
                    continue

                self._upsert_station(normalized, run)

            run.status = "completed"
            run.completed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(run)
            logger.info(
                f"Ingestion run #{run.id} finished: {run.records_inserted} inserted, "
                f"{run.records_updated} updated, {run.records_skipped} skipped."
            )
            return run

        except Exception as e:
            self.db.rollback()
            run.status = "failed"
            run.completed_at = datetime.utcnow()
            run.error_message = str(e)
            self.db.commit()
            logger.error(f"Ingestion run #{run.id} failed: {e}", exc_info=True)
            raise

    def _upsert_station(self, norm: NormalizedStation, run: IngestionRun) -> Station:
        """
        Idempotent upsert of a normalized station and its connectors.
        Guarantees that repeated ingestion updates records instead of duplicating them.
        """
        existing = (
            self.db.query(Station)
            .filter(Station.source == norm.source, Station.source_id == norm.source_id)
            .first()
        )

        now = datetime.utcnow()

        if existing:
            # Update mutable station fields
            existing.name = norm.name
            existing.operator_name = norm.operator_name
            existing.operator_id = norm.operator_id
            existing.latitude = norm.latitude
            existing.longitude = norm.longitude
            existing.h3_cell = norm.h3_cell
            existing.h3_resolution = norm.h3_resolution
            existing.address = norm.address
            existing.city = norm.city
            existing.state = norm.state
            existing.postcode = norm.postcode
            existing.country_code = norm.country_code
            existing.usage_type = norm.usage_type
            existing.usage_cost = norm.usage_cost
            existing.status_type = norm.status_type
            existing.is_operational = norm.is_operational
            existing.number_of_points = norm.number_of_points
            existing.data_quality_score = norm.data_quality_score
            existing.source_last_updated = norm.source_last_updated
            existing.updated_at = now

            # Refresh connectors (clean sync)
            self.db.query(StationConnector).filter(
                StationConnector.station_id == existing.id
            ).delete()

            for conn in norm.connectors:
                connector = StationConnector(
                    station_id=existing.id,
                    source_connector_id=conn.source_connector_id,
                    connector_type=conn.connector_type,
                    power_kw=conn.power_kw,
                    current_type=conn.current_type,
                    voltage=conn.voltage,
                    amperage=conn.amperage,
                    quantity=conn.quantity,
                    status=conn.status,
                )
                self.db.add(connector)

            run.records_updated += 1
            station_record = existing

        else:
            # Insert brand new station
            station_record = Station(
                source=norm.source,
                source_id=norm.source_id,
                name=norm.name,
                operator_name=norm.operator_name,
                operator_id=norm.operator_id,
                latitude=norm.latitude,
                longitude=norm.longitude,
                entrance_latitude=norm.entrance_latitude,
                entrance_longitude=norm.entrance_longitude,
                has_verified_entrance=norm.has_verified_entrance,
                h3_cell=norm.h3_cell,
                h3_resolution=norm.h3_resolution,
                address=norm.address,
                city=norm.city,
                state=norm.state,
                postcode=norm.postcode,
                country_code=norm.country_code,
                usage_type=norm.usage_type,
                usage_cost=norm.usage_cost,
                status_type=norm.status_type,
                is_operational=norm.is_operational,
                number_of_points=norm.number_of_points,
                data_quality_score=norm.data_quality_score,
                source_last_updated=norm.source_last_updated,
                ingested_at=now,
                updated_at=now,
            )
            self.db.add(station_record)
            self.db.flush()  # Flush to acquire station_record.id

            for conn in norm.connectors:
                connector = StationConnector(
                    station_id=station_record.id,
                    source_connector_id=conn.source_connector_id,
                    connector_type=conn.connector_type,
                    power_kw=conn.power_kw,
                    current_type=conn.current_type,
                    voltage=conn.voltage,
                    amperage=conn.amperage,
                    quantity=conn.quantity,
                    status=conn.status,
                )
                self.db.add(connector)

            run.records_inserted += 1

        self.db.flush()
        return station_record

    def run(
        self,
        country_code: str = "IN",
        max_results: int = 100,
        fixture_path: Optional[Path] = None,
        h3_resolution: Optional[int] = None,
    ) -> IngestionRun:
        """
        Execute ingestion workflow from either an offline fixture file or live OCM API.
        """
        if fixture_path:
            logger.info(f"Executing ingestion from offline fixture: {fixture_path}")
            raw_records = self.client.load_fixture(fixture_path)
        else:
            logger.info(f"Executing ingestion from live Open Charge Map API: country={country_code}")
            raw_records = self.client.fetch_live_stations(
                country_code=country_code,
                max_results=max_results,
            )

        return self.process_records(
            raw_records=raw_records,
            country_code=country_code,
            h3_resolution=h3_resolution,
        )
