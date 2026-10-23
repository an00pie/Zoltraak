"""API integration tests for health, station queries, H3 filters, and ingestion runs."""

from backend.app.ingestion.pipeline import IngestionPipeline


class TestAPI:

    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "Zoltraak"
        assert data["database"] == "connected"

    def test_list_stations_empty(self, client):
        response = client.get("/api/v1/stations")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_stations_and_filtering(self, client, db_session, sample_raw_data):
        # Seed test database via pipeline
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        # 1. Basic list
        resp = client.get("/api/v1/stations")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 4
        assert len(data["items"]) == 4

        # 2. Filter by City
        resp_city = client.get("/api/v1/stations?city=Bengaluru")
        assert resp_city.status_code == 200
        city_data = resp_city.json()
        assert city_data["total"] == 2
        for st in city_data["items"]:
            assert "Bengaluru" in st["city"]

        # 3. Filter by Operator
        resp_op = client.get("/api/v1/stations?operator=Zeon")
        assert resp_op.status_code == 200
        op_data = resp_op.json()
        assert op_data["total"] == 1
        assert "Zeon" in op_data["items"][0]["operator_name"]

        # 4. Filter by Connector Type
        resp_conn = client.get("/api/v1/stations?connector_type=CCS2")
        assert resp_conn.status_code == 200
        conn_data = resp_conn.json()
        assert conn_data["total"] == 4  # All 4 valid stations have CCS2

        # 5. Filter by Min Power kW (>= 100 kW)
        resp_power = client.get("/api/v1/stations?min_power_kw=100")
        assert resp_power.status_code == 200
        power_data = resp_power.json()
        assert power_data["total"] == 1  # Zeon 120kW
        assert power_data["items"][0]["source_id"] == 190002

        # 6. Filter by exact H3 Cell
        target_h3 = data["items"][0]["h3_cell"]
        resp_h3 = client.get(f"/api/v1/stations?h3_cell={target_h3}")
        assert resp_h3.status_code == 200
        h3_data = resp_h3.json()
        assert h3_data["total"] >= 1
        assert h3_data["items"][0]["h3_cell"] == target_h3

    def test_get_station_by_id(self, client, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        # Fetch ID 1
        resp = client.get("/api/v1/stations/1")
        assert resp.status_code == 200
        st = resp.json()
        assert st["id"] == 1
        assert len(st["connectors"]) > 0

        # Non-existent ID returns 404
        resp_404 = client.get("/api/v1/stations/9999")
        assert resp_404.status_code == 404

    def test_trigger_ingestion_api_with_fixture(self, client, sample_fixture_path):
        payload = {
            "country_code": "IN",
            "max_results": 10,
            "use_fixture": True,
            "fixture_path": str(sample_fixture_path),
        }
        resp = client.post("/api/v1/ingestion/run", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["records_inserted"] == 4
        assert data["records_skipped"] == 2

        # Check runs list
        resp_runs = client.get("/api/v1/ingestion/runs")
        assert resp_runs.status_code == 200
        runs = resp_runs.json()
        assert len(runs) >= 1
        assert runs[0]["status"] == "completed"
