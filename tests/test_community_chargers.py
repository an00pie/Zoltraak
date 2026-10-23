"""Tests for peer-to-peer community home EV chargers API endpoints."""

import pytest
from backend.app.db.models import CommunityCharger
from backend.app.db.seed_community_chargers import STANDARD_COMMUNITY_PRICE_PER_KWH


class TestCommunityChargersAPI:
    def test_list_community_chargers_auto_seeds(self, client, db_session):
        """Listing community chargers automatically populates synthetic Kerala chargers."""
        resp = client.get("/api/v1/community-chargers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 10
        first = data[0]
        assert "host_name" in first
        assert "phone" in first
        assert first["price_per_kwh"] == STANDARD_COMMUNITY_PRICE_PER_KWH
        assert "trust_score" in first
        assert "queue_count" in first
        assert first["is_community_host"] is True

    def test_list_community_chargers_geojson(self, client, db_session):
        """Test GeoJSON FeatureCollection format for community chargers map layer."""
        resp = client.get("/api/v1/community-chargers?as_geojson=true")
        assert resp.status_code == 200
        geojson = resp.json()
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) >= 10
        feature = geojson["features"][0]
        assert feature["geometry"]["type"] == "Point"
        assert len(feature["geometry"]["coordinates"]) == 2
        assert feature["properties"]["is_community_host"] is True

    def test_filter_by_city(self, client, db_session):
        """Filter community chargers by city name (e.g. Chalakudy)."""
        resp = client.get("/api/v1/community-chargers?city=Chalakudy")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2
        for item in data:
            assert item["city"] == "Chalakudy"

    def test_create_community_charger(self, client, db_session):
        """Allow a homeowner to register and list their home EV charger."""
        payload = {
            "host_name": "Suresh G.",
            "title": "Suresh's Solar Garage EV Point",
            "phone": "+91 98471 00000",
            "address": "Hillview Road, Near Kaloor Stadium",
            "city": "Kochi",
            "state": "Kerala",
            "latitude": 9.9980,
            "longitude": 76.2990,
            "connector_type": "Type 2 (AC)",
            "power_kw": 7.4,
            "price_per_kwh": 11.50,
            "access_hours": "6:00 AM - 10:00 PM",
            "amenities": "Covered Garage, Wi-Fi",
            "notes": "Gate on left side.",
        }

        resp = client.post("/api/v1/community-chargers", json=payload)
        assert resp.status_code == 201
        res_data = resp.json()
        assert res_data["status"] == "success"
        charger = res_data["charger"]
        assert charger["host_name"] == "Suresh G."
        assert charger["price_per_kwh"] == STANDARD_COMMUNITY_PRICE_PER_KWH
        assert charger["h3_cell"] is not None

        # Verify it appears in list
        resp_list = client.get("/api/v1/community-chargers?city=Kochi")
        assert resp_list.status_code == 200
        host_names = [c["host_name"] for c in resp_list.json()]
        assert "Suresh G." in host_names

    def test_update_charger_status(self, client, db_session):
        """Update live availability and queue count."""
        resp_list = client.get("/api/v1/community-chargers")
        first_id = resp_list.json()[0]["id"]

        patch_payload = {
            "availability_status": "in_use",
            "queue_count": 2,
        }
        resp_patch = client.patch(f"/api/v1/community-chargers/{first_id}/status", json=patch_payload)
        assert resp_patch.status_code == 200
        patch_data = resp_patch.json()
        assert patch_data["availability_status"] == "in_use"
        assert patch_data["queue_count"] == 2
