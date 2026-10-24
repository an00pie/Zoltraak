# 🔌 Zoltraak API Reference (v1)

Base URL: `http://localhost:8000/api/v1` (or your production deployment URL)

All endpoints accept and return `application/json` unless otherwise specified. Interactive Swagger UI documentation is available at `http://localhost:8000/docs` and ReDoc at `http://localhost:8000/redoc`.

---

## Table of Contents
1. [Health & Diagnostics](#1-health--diagnostics)
2. [Public Charging Stations](#2-public-charging-stations)
3. [Peer-to-Peer Community Chargers](#3-peer-to-peer-community-chargers)
4. [Crowdsourced Reports & Feedback](#4-crowdsourced-reports--feedback)
5. [Routing & Corridor Detour Planner](#5-routing--corridor-detour-planner)
6. [Geocoding & Location Search](#6-geocoding--location-search)
7. [Data Ingestion & Sync Pipelines](#7-data-ingestion--sync-pipelines)

---

## 1. Health & Diagnostics

### `GET /health`
Returns the operational status of the API engine and database connection.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 2. Public Charging Stations

### `GET /stations`
List public charging stations with pagination, spatial filtering, and attribute filters.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `h3_index` | string | No | `null` | 15-character Uber H3 hex index to filter by cell |
| `k_ring` | int | No | `0` | Radius of neighboring H3 hexagons to include |
| `status` | string | No | `null` | Operational status: `Operational`, `NonOperational`, `Unknown` |
| `min_power_kw` | float | No | `null` | Minimum power rating in kW |
| `connector_type` | string | No | `null` | Filter by connector (e.g., `CCS2`, `Type2`, `CHAdeMO`, `GB_T`) |
| `skip` | int | No | `0` | Pagination offset |
| `limit` | int | No | `50` | Maximum items to return (max 500) |
| `as_geojson` | bool | No | `false` | When true, returns standard GeoJSON `FeatureCollection` |

**Response `200 OK`**:
```json
{
  "total": 524,
  "skip": 0,
  "limit": 50,
  "stations": [
    {
      "id": 1,
      "ocm_id": 194821,
      "name": "Tata Power - Vivanta Kochi",
      "operator_name": "Tata Power",
      "latitude": 9.9674,
      "longitude": 76.2711,
      "h3_index_res8": "8860145893fffff",
      "status": "Operational",
      "usage_cost": "₹18/kWh + GST",
      "connectors": [
        {
          "id": 1,
          "connector_type": "CCS2",
          "power_kw": 60.0,
          "current_type": "DC",
          "quantity": 2,
          "status": "Operational"
        }
      ]
    }
  ]
}
```

### `GET /stations/nearby`
Find stations near a specific GPS coordinate, sorted by distance.

**Query Parameters:**
* `lat` (float, required): Latitude
* `lng` (float, required): Longitude
* `radius_km` (float, optional, default: `25.0`): Search radius in kilometers
* `limit` (int, optional, default: `20`): Max stations to return

### `GET /stations/h3-grid`
Generates a GeoJSON `FeatureCollection` of Uber H3 hexagonal polygons covering the requested bounding box or cluster centers, with station density counts.

**Query Parameters:**
* `resolution` (int, optional, default: `8`): H3 resolution (6–9)
* `min_lat` (float, optional): Viewport south latitude
* `min_lng` (float, optional): Viewport west longitude
* `max_lat` (float, optional): Viewport north latitude
* `max_lng` (float, optional): Viewport east longitude

### `GET /stations/{station_id}`
Retrieve complete station details, connector list, and operator status history.

### `PATCH /stations/{station_id}/operator-status`
Allows commercial station operators to update live operational status, queue length, and notes.

**Request Body:**
```json
{
  "status": "Operational",
  "queue_length": 1,
  "operator_notes": "Both CCS2 guns operational. Bay 1 recently serviced."
}
```

---

## 3. Peer-to-Peer Community Chargers

### `GET /community-chargers`
List residential community home chargers across Kerala with optional district, city, or status filters.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `city` | string | No | `null` | Filter by city/district name (e.g., `Kochi`, `Trivandrum`) |
| `status` | string | No | `null` | `available`, `busy`, `offline` |
| `as_geojson` | bool | No | `false` | Return as GeoJSON `FeatureCollection` |

**Response `200 OK`**:
```json
[
  {
    "id": "kl-ern-001",
    "host_name": "Siddharth Menon",
    "name": "Menon Home Wallbox - Panampilly Nagar",
    "address": "Plot 42, Panampilly Nagar, Kochi, Kerala",
    "city": "Kochi",
    "latitude": 9.9587,
    "longitude": 76.2934,
    "power_kw": 7.4,
    "connector_type": "Type 2 AC",
    "tariff_per_kwh": 11.50,
    "status": "available",
    "queue_count": 0,
    "trust_score": 4.9,
    "reviews_count": 14,
    "phone": "+91 98470 12345",
    "access_notes": "Gated driveway, ring the bell on arrival"
  }
]
```

### `POST /community-chargers`
Register a new residential home EV charger.

**Request Body:**
```json
{
  "host_name": "Deepa Nair",
  "name": "Nair Residence 7.4kW Wallbox",
  "address": "Kowdiar, Thiruvananthapuram, Kerala",
  "city": "Thiruvananthapuram",
  "latitude": 8.5241,
  "longitude": 76.9602,
  "power_kw": 7.4,
  "connector_type": "Type 2 AC",
  "phone": "+91 94470 54321",
  "access_notes": "Available evenings after 6 PM and weekends"
}
```

### `PUT /community-chargers/{charger_id}`
Update host availability, driveway queue count, or access instructions.

**Request Body:**
```json
{
  "status": "busy",
  "queue_count": 1,
  "access_notes": "Vehicle currently plugged in until 4 PM"
}
```

---

## 4. Crowdsourced Reports & Feedback

### `POST /reports`
Submit an on-the-ground driver report or star rating for a station or home charger.

**Request Body:**
```json
{
  "station_id": 142,
  "community_charger_id": null,
  "report_type": "operational",
  "rating": 5,
  "comment": "Charged Tata Nexon from 20% to 80% in 35 mins. Great coffee shop nearby.",
  "reporter_role": "driver"
}
```

*Note: If `report_type` is set to `broken` or `unavailable`, the station's status is automatically flagged to alert upcoming drivers.*

### `GET /reports`
Retrieve crowdsourced reviews, ratings, and latest status reports for a target station.

**Query Parameters:**
* `station_id` (int, required): Target station ID or community charger ID
* `station_type` (string, optional, default: `"public"`): `"public"` or `"community"`
* `limit` (int, optional, default: `20`): Maximum reports to retrieve

---

## 5. Routing & Corridor Detour Planner

### `POST /routing/plan`
Calculates the optimal EV route between origin and destination with corridor charging detours.

**Request Body:**
```json
{
  "start": [76.2711, 9.9674],
  "destination": [76.9602, 8.5241],
  "selected_station_ids": [],
  "battery_capacity_kwh": 40.5,
  "current_soc_pct": 85.0,
  "target_min_soc_pct": 20.0
}
```

**Response `200 OK`**:
```json
{
  "route_polyline": "u`m_F|~vhO...",
  "distance_km": 204.8,
  "duration_mins": 265.4,
  "recommended_stops": [
    {
      "station_id": 89,
      "name": "KSEB Charging Hub Alappuzha",
      "detour_km": 1.2,
      "charge_duration_mins": 35.0,
      "arrival_soc_pct": 28.4,
      "departure_soc_pct": 80.0
    }
  ],
  "corridor_candidates": [...]
}
```

### `GET /routing/preset-cities`
Returns predefined key cities and regional waypoint coordinates along popular Indian EV highway corridors (e.g., *Kochi, Alappuzha, Kollam, Trivandrum, Thrissur, Palakkad*).

---

## 6. Geocoding & Location Search

### `GET /geo/search`
Forward search for places, cities, and landmarks across India using OpenStreetMap Nominatim.

**Query Parameters:**
* `q` (string, required): Query string (e.g., `Edappally Kochi`, `MG Road Bengaluru`)
* `limit` (int, optional, default: `5`): Maximum results

### `GET /geo/reverse`
Reverse geocode GPS coordinates into a human-readable address.

---

## 7. Data Ingestion & Sync Pipelines

### `POST /ingestion/trigger`
Trigger an idempotent sync run from the Open Charge Map (OCM) v3 API or a local JSON fixture.

**Query Parameters:**
* `source_type` (string): `ocm_api` or `local_fixture`
* `country_code` (string, optional, default: `IN`): ISO 3166-1 alpha-2 country code
* `max_results` (int, optional, default: `500`): Maximum stations to ingest

### `GET /ingestion/runs`
List previous ingestion audit logs, timestamps, station counts, and error summaries.
