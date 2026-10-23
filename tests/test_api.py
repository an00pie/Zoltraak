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

    def test_stations_metadata(self, client, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        resp = client.get("/api/v1/stations/metadata")
        assert resp.status_code == 200
        meta = resp.json()
        assert meta["total_stations"] == 4
        assert len(meta["operators"]) >= 1
        assert "CCS2" in meta["connector_types"]
        assert len(meta["power_brackets"]) > 0

    def test_h3_grid_geojson(self, client, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        resp = client.get("/api/v1/stations/h3-grid")
        assert resp.status_code == 200
        geojson = resp.json()
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) == 4  # Each test station is in distinct cell
        feature = geojson["features"][0]
        assert feature["geometry"]["type"] == "Polygon"
        assert len(feature["geometry"]["coordinates"][0]) >= 7  # closed hexagon ring
        assert "station_count" in feature["properties"]
        assert feature["properties"]["station_count"] >= 1

    def test_geo_search_endpoint(self, client):
        resp = client.get("/api/v1/geo/search?q=Bengaluru")
        assert resp.status_code == 200
        results = resp.json()
        assert isinstance(results, list)
        assert len(results) >= 1
        assert "latitude" in results[0]
        assert "longitude" in results[0]

    def test_geo_reverse_endpoint(self, client):
        resp = client.get("/api/v1/geo/reverse?latitude=12.9716&longitude=77.5946")
        assert resp.status_code == 200
        result = resp.json()
        assert "display_name" in result

    def test_h3_grid_dynamic_zoom(self, client, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        # Test low zoom (aggregates to Res 5)
        resp_low = client.get("/api/v1/stations/h3-grid?zoom=5.0")
        assert resp_low.status_code == 200
        data_low = resp_low.json()
        assert data_low["resolution"] == 5
        assert len(data_low["features"]) > 0

        # Test high zoom (subdivides to Res 9)
        resp_high = client.get("/api/v1/stations/h3-grid?zoom=13.0")
        assert resp_high.status_code == 200
        data_high = resp_high.json()
        assert data_high["resolution"] == 9

        # Test bounding box filtering
        resp_bbox = client.get(
            "/api/v1/stations/h3-grid?min_lat=12.0&max_lat=14.0&min_lng=77.0&max_lng=78.5"
        )
        assert resp_bbox.status_code == 200
        data_bbox = resp_bbox.json()
        assert len(data_bbox["features"]) > 0

    def test_nearby_stations_endpoint(self, client, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        # Query nearby Bangalore stations
        resp = client.get(
            "/api/v1/stations/nearby?latitude=12.9716&longitude=77.5946&radius_km=50&sort_by=distance"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_nearby" in data
        assert data["total_nearby"] >= 1
        assert "items" in data
        assert len(data["items"]) >= 1

        first_st = data["items"][0]
        assert "distance_km" in first_st
        assert "connectors" in first_st
        assert first_st["distance_km"] <= 50

        # Test sorting by power
        resp_power = client.get(
            "/api/v1/stations/nearby?latitude=12.9716&longitude=77.5946&radius_km=50&sort_by=power"
        )
        assert resp_power.status_code == 200
        data_power = resp_power.json()
        if len(data_power["items"]) > 1:
            power0 = data_power["items"][0]["max_power_kw"] or 0
            power1 = data_power["items"][1]["max_power_kw"] or 0
            assert power0 >= power1
