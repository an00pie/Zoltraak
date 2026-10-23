"""Unit and integration tests for crowdsourced reports and owner management APIs."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_submit_and_list_community_reports():
    # 1. Fetch community chargers to get an existing ID
    res = client.get("/api/v1/community-chargers")
    assert res.status_code == 200
    chargers = res.json()
    assert len(chargers) > 0
    test_charger_id = chargers[0]["id"]

    # 2. Submit a report as a customer
    report_data = {
        "station_type": "community",
        "station_id": test_charger_id,
        "user_name": "Deepak EV",
        "user_role": "customer",
        "report_status": "available",
        "rating": 5,
        "comment": "Super clean parking, charged at 7.4 kW smoothly!",
    }
    submit_res = client.post("/api/v1/reports", json=report_data)
    assert submit_res.status_code == 201
    data = submit_res.json()
    assert data["status"] == "success"
    assert data["report"]["rating"] == 5

    # 3. Retrieve reports
    list_res = client.get(f"/api/v1/reports?station_id={test_charger_id}&station_type=community")
    assert list_res.status_code == 200
    reports_data = list_res.json()
    assert reports_data["station_id"] == test_charger_id
    assert reports_data["total_reports"] >= 1


def test_report_unavailable_updates_status():
    res = client.get("/api/v1/community-chargers")
    charger_id = res.json()[1]["id"]

    # Report as unavailable
    report_data = {
        "station_type": "community",
        "station_id": charger_id,
        "user_name": "Varun M.",
        "user_role": "customer",
        "report_status": "unavailable",
        "rating": 2,
        "comment": "Wallbox trip switch was down, unable to initiate charge.",
    }
    submit_res = client.post("/api/v1/reports", json=report_data)
    assert submit_res.status_code == 201

    # Verify charger status updated
    get_res = client.get(f"/api/v1/community-chargers/{charger_id}")
    assert get_res.status_code == 200
    assert get_res.json()["availability_status"] == "unavailable"


def test_homeowner_update_charger_details():
    res = client.get("/api/v1/community-chargers")
    charger_id = res.json()[0]["id"]

    update_payload = {
        "title": "Updated Green Villa Charger",
        "power_kw": 11.0,
        "availability_status": "available",
        "queue_count": 1,
        "access_hours": "5:00 AM - 11:00 PM",
        "notes": "Gate code is 1234",
    }
    put_res = client.put(f"/api/v1/community-chargers/{charger_id}", json=update_payload)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["status"] == "success"
    assert data["charger"]["title"] == "Updated Green Villa Charger"
    assert data["charger"]["power_kw"] == 11.0
    assert data["charger"]["queue_count"] == 1
