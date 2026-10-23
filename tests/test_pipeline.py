"""Integration tests for IngestionPipeline, database persistence, and idempotency."""

from backend.app.db.models import Station, StationConnector, IngestionRun
from backend.app.ingestion.pipeline import IngestionPipeline
from backend.app.ingestion.h3_indexer import H3SpatialIndexer


class TestIngestionPipeline:

    def test_pipeline_ingest_from_raw_records(self, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        run = pipeline.process_records(sample_raw_data, country_code="IN", h3_resolution=8)

        # 6 records in fixture: 4 valid, 2 malformed
        assert run.status == "completed"
        assert run.records_fetched == 6
        assert run.records_inserted == 4
        assert run.records_updated == 0
        assert run.records_skipped == 2

        # Verify DB records
        stations = db_session.query(Station).all()
        assert len(stations) == 4

        # Verify each station has valid coordinates and H3 cell
        for st in stations:
            assert st.country_code == "IN"
            assert st.latitude is not None
            assert st.longitude is not None
            assert H3SpatialIndexer.is_valid_h3(st.h3_cell) is True
            assert st.h3_resolution == 8

        # Verify connectors count
        connectors = db_session.query(StationConnector).all()
        assert len(connectors) == 7

        # Check specific Tata Power station connectors
        tata = db_session.query(Station).filter(Station.source_id == 190001).first()
        assert tata is not None
        assert len(tata.connectors) == 2
        connector_types = [c.connector_type for c in tata.connectors]
        assert "CCS2" in connector_types
        assert "Type 2" in connector_types

    def test_pipeline_idempotency_no_duplicates(self, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)

        # First run: inserts 4 stations
        run1 = pipeline.process_records(sample_raw_data, country_code="IN")
        assert run1.records_inserted == 4
        assert run1.records_updated == 0

        # Second run with exact same data: should update 4 stations, insert 0
        run2 = pipeline.process_records(sample_raw_data, country_code="IN")
        assert run2.records_inserted == 0
        assert run2.records_updated == 4
        assert run2.records_skipped == 2

        # Station count in DB MUST remain 4 (no duplicates)
        total_stations = db_session.query(Station).count()
        assert total_stations == 4

        # Connector count in DB MUST remain 7 (no duplicate connectors)
        total_connectors = db_session.query(StationConnector).count()
        assert total_connectors == 7

    def test_pipeline_updates_modified_fields(self, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        # Mutate title and cost of station 190001 in incoming payload
        modified_data = [dict(record) for record in sample_raw_data]
        modified_data[0]["AddressInfo"] = dict(sample_raw_data[0]["AddressInfo"])
        modified_data[0]["AddressInfo"]["Title"] = "Updated Electronic City Supercharger"
        modified_data[0]["UsageCost"] = "₹25 per kWh"

        pipeline.process_records(modified_data, country_code="IN")

        updated_st = db_session.query(Station).filter(Station.source_id == 190001).first()
        assert updated_st.name == "Updated Electronic City Supercharger"
        assert updated_st.usage_cost == "₹25 per kWh"

    def test_pipeline_records_ingestion_run_audit(self, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        run = pipeline.process_records(sample_raw_data, country_code="IN")

        db_run = db_session.query(IngestionRun).filter(IngestionRun.id == run.id).first()
        assert db_run is not None
        assert db_run.status == "completed"
        assert db_run.started_at is not None
        assert db_run.completed_at is not None
        assert db_run.records_fetched == 6
