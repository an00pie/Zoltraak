"""Automated tests for OSRM routing, corridor detour ratings, and EV trip planning."""

from backend.app.routing.osrm import OSRMClient
from backend.app.routing.corridor import CorridorAnalyzer, haversine_distance
from backend.app.ingestion.pipeline import IngestionPipeline


class TestRoutingAndCorridor:

    def test_haversine_distance(self):
        # Distance between Kochi (9.9312, 76.2673) and Chalakudy (10.3031, 76.3370)
        dist = haversine_distance(9.9312, 76.2673, 10.3031, 76.3370)
        assert 40.0 < dist < 45.0

    def test_osrm_client_direct_route(self):
        client = OSRMClient()
        route = client.get_route(
            origin_lng=76.2673,
            origin_lat=9.9312,
            dest_lng=76.3370,
            dest_lat=10.3031,
        )
        assert route["status"] in ("success", "fallback")
        assert route["distance_km"] > 30.0
        assert route["duration_min"] > 20.0
        assert len(route["coordinates"]) >= 2

    def test_osrm_client_multi_stop_route(self):
        client = OSRMClient()
        route = client.get_route_via_waypoint(
            origin_lng=76.2673,
            origin_lat=9.9312,
            stop_lng=76.3370,
            stop_lat=10.3031,
            dest_lng=76.2144,
            dest_lat=10.5276,
        )
        assert route["status"] in ("success", "fallback")
        assert route["distance_km"] > 50.0
        assert len(route["coordinates"]) >= 3

    def test_corridor_candidate_ratings(self, db_session, sample_raw_data):
        # Seed test stations
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        # Route between Bangalore South (12.8000, 77.6500) and Hosur (12.7409, 77.8253)
        # Tata Power Electronic City is at (12.8399, 77.6770) right on this corridor
        candidates = CorridorAnalyzer.evaluate_corridor_candidates(
            db=db_session,
            origin_lat=12.8000,
            origin_lng=77.6500,
            dest_lat=12.7409,
            dest_lng=77.8253,
            current_soc=50.0,
            battery_capacity_kwh=40.5,
            min_reserve_soc=15.0,
        )

        assert len(candidates) >= 1
        tata = next((c for c in candidates if c["source_id"] == 190001), None)
        assert tata is not None
        assert tata["detour_km"] < 10.0
        assert tata["tier"] in ("optimal", "acceptable")
        assert tata["is_reachable"] is True

    def test_routing_plan_api(self, client, db_session, sample_raw_data):
        pipeline = IngestionPipeline(db=db_session)
        pipeline.process_records(sample_raw_data, country_code="IN")

        payload = {
            "origin": {"name": "Start", "latitude": 12.8000, "longitude": 77.6500},
            "destination": {"name": "End", "latitude": 12.7409, "longitude": 77.8253},
            "current_soc": 40.0,
            "battery_capacity_kwh": 40.5,
            "min_reserve_soc": 15.0,
        }

        resp = client.post("/api/v1/routing/plan", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "direct_route" in data
        assert "battery_parameters" in data
        assert "candidate_stations" in data
        assert "metrics" in data
        assert data["direct_route"]["distance_km"] > 0

    def test_preset_cities_api(self, client):
        resp = client.get("/api/v1/routing/preset-cities")
        assert resp.status_code == 200
        cities = resp.json()
        assert len(cities) >= 5
        city_names = [c["name"] for c in cities]
        assert "Chalakudy" in city_names
        assert "Kochi (Ernakulam)" in city_names
