# ⚡ Zoltraak

> **Intelligent, charging-aware EV route planner and community peer-to-peer charging network for India, powered by Uber H3 discrete spatial indexing.**

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20(React)-black.svg?style=flat-square&logo=next.js)](https://nextjs.org)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-Interactive_GIS-blueviolet.svg?style=flat-square)](https://maplibre.org)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Uber H3](https://img.shields.io/badge/H3-Discrete_Spatial_Index-orange.svg?style=flat-square)](https://h3geo.org/)
[![Database](https://img.shields.io/badge/DB-PostgreSQL%20%7C%20SQLite-indigo.svg?style=flat-square)](https://www.sqlalchemy.org/)
[![Tests](https://img.shields.io/badge/Tests-45%2F45%20Passing-brightgreen.svg?style=flat-square)](tests)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 📌 Overview

**Zoltraak** is an Electric Vehicle (EV) routing platform and peer-to-peer charging ecosystem specifically engineered for Indian highway corridors and urban districts. 

Unlike conventional navigation applications that only calculate the shortest road distance, Zoltraak models real-world battery discharge profiles, connector compatibility, en-route corridor detours, and live charging station reliability. Furthermore, Zoltraak unlocks private residential charging by providing a **Peer-to-Peer Community Home Charger Network** with standardized, transparent tariffs.

### 🌟 Core Capabilities

* **🚗 Corridor-Aware Route Planner (Point A to Point B):** Full OSRM road routing with turn-by-turn geometry, battery State of Charge (SoC) prediction, and candidate charging stops evaluated using detour distance, charger speed, and real-time reliability scores.
* **⬡ Uber H3 Spatial Indexing & Dynamic Zoom Grid:** High-performance spatial indexing converting lat/lon coordinates into 64-bit integer hexagons. Dynamically adapts H3 resolutions from Res 6 (~36 km²) at state scale down to Res 9 (~0.1 km²) at street scale as the user zooms.
* **🏠 Peer-to-Peer Community Home Charger Network:** 171+ verified synthetic home hosts across all 14 districts of Kerala with standard fixed residential tariffs (**₹11.50/kWh**), live driveway queue indicators, and trust ratings.
* **⚡ Public Fast Charging Hubs (Open Charge Map):** 500+ Indian fast-charging stations (Tata Power, KSEB, Zeon, Jio-bp, Relux) with live status and connector specifications (CCS2, Type 2 AC, CHAdeMO).
* **👥 Multi-Persona Experience:** Seamlessly switch between **EV Driver**, **Community Home Host**, and **Commercial Station Operator** with dedicated management drawers and actions.
* **📣 Crowdsourced Real-Time Outage Detection:** Drivers report broken chargers or unavailable bays with instant status propagation on the live map to protect other motorists from stranded trips.
* **🚘 Indian EV Garage & Onboarding:** Pre-configured battery capacities and charging profiles for Tata Nexon EV, Punch EV, MG ZS EV, Mahindra XUV400, Ather 450X, Ola S1 Pro, Ultraviolette F77, and more.
* **🗺️ Clean Minimalist HUD:** Minimal dark aesthetic, real HTML5 browser GPS recentering, 3-way station filtering (`All`, `Home Only (Blue)`, `Public Only (Green)`), and one-click export to Google Maps Navigation.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ZOLTRAAK ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────────┘

    [ EV Driver / Host / Operator Browser ]
                       │
                       ▼
       ┌───────────────────────────────┐
       │   Next.js 14 (App Router)     │  <-- React 18, Tailwind CSS, Lucide
       │   MapLibre GL Vector Engine   │  <-- Dynamic H3 GeoJSON & GPS HUD
       └───────────────┬───────────────┘
                       │ HTTP / REST (v1)
                       ▼
       ┌───────────────────────────────┐
       │      FastAPI Backend Engine   │  <-- Python 3.11+, Pydantic v2
       │   ├─ Uber H3 Spatial Indexer  │  <-- Resolutions 6-9 & k-rings
       │   ├─ Corridor Detour Scorer   │  <-- Detour km + kW + Star Ratings
       │   └─ Data Normalization Layer │  <-- OCM v3 Ingestion & Cleaners
       └───────┬───────────────┬───────┘
               │               │
       ┌───────▼───────┐       └─────────────────────────────┐
       │ SQLAlchemy 2  │                                     │
       │ SQLite / PostGIS                                    ▼
       └───────────────┘                     [ External Cloud Services ]
                                             ├─ OSRM Turn-by-Turn Routing
                                             ├─ Open Charge Map (OCM) v3
                                             └─ OSM Nominatim Geocoding
```

For in-depth architectural specifications and mathematical formulations of the corridor scoring function, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 📁 Repository Structure

```
zoltraak/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                  # Database dependency injection
│   │   │   └── v1/
│   │   │       ├── community_chargers.py # P2P home chargers REST endpoints
│   │   │       ├── geo.py               # Forward / reverse Nominatim geocoding
│   │   │       ├── health.py            # API health & DB connectivity probe
│   │   │       ├── ingestion.py         # OCM sync trigger & audit logs
│   │   │       ├── reports.py           # Crowdsourced driver outage reports
│   │   │       ├── router.py            # Aggregated v1 API router
│   │   │       ├── routing.py           # Corridor routing & preset planners
│   │   │       └── stations.py          # Spatial H3 & nearby station queries
│   │   ├── core/
│   │   │   └── config.py                # Pydantic v2 environment configuration
│   │   ├── db/
│   │   │   ├── models.py                # SQLAlchemy ORM models
│   │   │   └── session.py               # Engine & session management (SQLite / Postgres)
│   │   ├── ingestion/
│   │   │   ├── client.py                # Open Charge Map HTTP client
│   │   │   ├── h3_indexer.py            # Uber H3 indexing & disk neighbor calculations
│   │   │   ├── normalizer.py            # Data cleaning & connector mapping
│   │   │   └── pipeline.py              # Idempotent upsert & transaction orchestrator
│   │   ├── schemas/
│   │   │   ├── community_charger.py     # P2P charger DTO schemas
│   │   │   ├── ingestion.py             # Ingestion request / response schemas
│   │   │   ├── report.py                # Crowdsourced feedback schemas
│   │   │   ├── routing.py               # OSRM corridor route planning schemas
│   │   │   └── station.py               # Public station response DTOs
│   │   └── main.py                      # FastAPI application entrypoint with CORS
│   └── scripts/
│       ├── ingest.py                    # CLI ingestion tool with formatted reports
│       └── seed_kerala_chargers.py      # Kerala synthetic P2P charger generator
├── data/
│   ├── fixtures/
│   │   └── sample_ocm_india.json        # Curated Indian charging station dataset
│   └── zoltraak.db                      # Local SQLite database (git-ignored)
├── docs/
│   ├── API_REFERENCE.md                 # Complete v1 REST API endpoint specs
│   ├── ARCHITECTURE.md                  # Detailed system architecture & H3 design
│   └── USER_GUIDE.md                    # Workflows for Drivers, Hosts & Operators
├── frontend/
│   ├── app/
│   │   ├── layout.js                    # Next.js root layout with metadata
│   │   ├── page.js                      # Main interactive map & route planning view
│   │   └── globals.css                  # Tailwind CSS styling & custom scrollbars
│   ├── components/
│   │   ├── FilterBar.js                 # Minimalist station filter bar
│   │   ├── LandingPage.js               # Clean onboarding landing page
│   │   ├── ListHomeChargerModal.js      # Host registration modal
│   │   ├── MapFloatingControls.js       # Dynamic floating action pills
│   │   ├── MapView.js                   # MapLibre GL map engine & H3 layers
│   │   ├── MobileSearchBar.js           # Responsive mobile search & filter bar
│   │   ├── NavigationHud.js             # Active GPS turn-by-turn route HUD
│   │   ├── OnboardingModal.js           # Multi-brand EV garage vehicle selector
│   │   ├── ProfileDrawer.js             # User persona switcher & garage drawer
│   │   ├── ReportStationModal.js        # Crowdsourced driver rating & outage modal
│   │   ├── RoutePlannerModal.js         # Point A to B corridor detour route planner
│   │   └── StationDetailsDrawer.js      # Station specs, connectors & host details
│   ├── data/
│   │   └── vehicles.js                  # Indian EV database (capacities & connectors)
│   └── package.json                     # Frontend dependencies & Next.js scripts
├── tests/
│   ├── conftest.py                      # Test database & client fixtures
│   ├── test_api.py                      # Public station and grid API tests
│   ├── test_community_chargers.py       # P2P home charger API tests
│   ├── test_h3_indexer.py               # Uber H3 indexing unit tests
│   ├── test_normalizer.py               # Station normalizer unit tests
│   ├── test_pipeline.py                 # Ingestion pipeline tests
│   ├── test_reports.py                  # Crowdsourced outage reporting tests
│   └── test_routing.py                  # OSRM corridor route planning tests
├── .env.example                         # Environment configuration template
├── pyproject.toml                       # Python package metadata & dependencies
└── README.md                            # Project overview & documentation
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
* **Python 3.11+** with `uv` (recommended) or `pip` / `virtualenv`
* **Node.js 18+** with `npm`

---

### 2. Backend Setup

```bash
# Clone the repository
git clone https://github.com/an00pie/Zoltraak.git
cd Zoltraak

# Create and activate virtual environment with Python 3.11
uv venv --python 3.11 .venv
source .venv/bin/activate

# Install backend dependencies
uv pip install -e ".[dev]"

# Configure environment variables
cp .env.example .env

# Run database migrations and seed sample Indian stations
python -m backend.scripts.ingest --source fixture --file data/fixtures/sample_ocm_india.json

# Seed Kerala synthetic P2P community home chargers
python -m backend.scripts.seed_kerala_chargers

# Start the FastAPI development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be live at `http://127.0.0.1:8000`. You can inspect the interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Setup

In a new terminal window:

```bash
cd Zoltraak/frontend

# Install frontend dependencies
npm install

# Start the Next.js development server
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## 🧪 Automated Testing

Zoltraak maintains a comprehensive automated test suite spanning unit tests, spatial indexing validation, and end-to-end API integration tests.

```bash
# Activate virtual environment
source .venv/bin/activate

# Execute all pytest test suites
pytest -v
```

### Test Suite Results:
```
============================== test session starts ==============================
collected 45 items

tests/test_api.py::TestAPI::test_health_check PASSED                     [  2%]
tests/test_api.py::TestAPI::test_list_stations_empty PASSED              [  4%]
tests/test_api.py::TestAPI::test_list_stations_and_filtering PASSED      [  6%]
tests/test_api.py::TestAPI::test_get_station_by_id PASSED                [  8%]
tests/test_api.py::TestAPI::test_trigger_ingestion_api_with_fixture PASSED [ 11%]
tests/test_api.py::TestAPI::test_stations_metadata PASSED                [ 13%]
tests/test_api.py::TestAPI::test_h3_grid_geojson PASSED                  [ 15%]
tests/test_api.py::TestAPI::test_geo_search_endpoint PASSED              [ 17%]
tests/test_api.py::TestAPI::test_geo_reverse_endpoint PASSED             [ 20%]
tests/test_api.py::TestAPI::test_h3_grid_dynamic_zoom PASSED             [ 22%]
tests/test_api.py::TestAPI::test_nearby_stations_endpoint PASSED         [ 24%]
tests/test_community_chargers.py::TestCommunityChargersAPI::test_list_community_chargers_auto_seeds PASSED [ 26%]
tests/test_community_chargers.py::TestCommunityChargersAPI::test_list_community_chargers_geojson PASSED [ 28%]
tests/test_community_chargers.py::TestCommunityChargersAPI::test_filter_by_city PASSED [ 31%]
tests/test_community_chargers.py::TestCommunityChargersAPI::test_create_community_charger PASSED [ 33%]
tests/test_community_chargers.py::TestCommunityChargersAPI::test_update_charger_status PASSED [ 35%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_coordinate_to_h3_valid PASSED [ 37%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_coordinate_to_h3_resolutions PASSED [ 40%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_is_valid_coordinate PASSED [ 42%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_coordinate_to_h3_invalid_raises_value_error PASSED [ 44%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_h3_to_coordinate PASSED [ 46%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_h3_to_coordinate_invalid_raises PASSED [ 48%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_get_h3_disk PASSED  [ 51%]
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_h3_to_polygon_coordinates PASSED [ 53%]
tests/test_normalizer.py::TestStationNormalizer::test_normalize_valid_station PASSED [ 55%]
tests/test_normalizer.py::TestStationNormalizer::test_normalize_malformed_missing_latitude PASSED [ 57%]
tests/test_normalizer.py::TestStationNormalizer::test_normalize_malformed_out_of_range_coordinates PASSED [ 60%]
tests/test_normalizer.py::TestStationNormalizer::test_normalize_missing_id PASSED [ 62%]
tests/test_normalizer.py::TestStationNormalizer::test_normalize_missing_address_info PASSED [ 64%]
tests/test_normalizer.py::TestStationNormalizer::test_connector_mapping_standard_ids PASSED [ 66%]
tests/test_normalizer.py::TestStationNormalizer::test_operational_status_mapping PASSED [ 68%]
tests/test_normalizer.py::TestStationNormalizer::test_parse_datetime PASSED [ 71%]
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_ingest_from_raw_records PASSED [ 73%]
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_idempotency_no_duplicates PASSED [ 75%]
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_updates_modified_fields PASSED [ 77%]
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_records_ingestion_run_audit PASSED [ 80%]
tests/test_reports.py::test_submit_and_list_community_reports PASSED     [ 82%]
tests/test_reports.py::test_report_unavailable_updates_status PASSED     [ 84%]
tests/test_reports.py::test_homeowner_update_charger_details PASSED      [ 86%]
tests/test_routing.py::TestRoutingAndCorridor::test_haversine_distance PASSED [ 88%]
tests/test_routing.py::TestRoutingAndCorridor::test_osrm_client_direct_route PASSED [ 91%]
tests/test_routing.py::TestRoutingAndCorridor::test_osrm_client_multi_stop_route PASSED [ 93%]
tests/test_routing.py::TestRoutingAndCorridor::test_corridor_candidate_ratings PASSED [ 95%]
tests/test_routing.py::TestRoutingAndCorridor::test_routing_plan_api PASSED [ 97%]
tests/test_routing.py::TestRoutingAndCorridor::test_preset_cities_api PASSED [100%]

======================== 45 passed, 1 warning in 10.14s ========================
```

---

## 📚 Detailed Documentation

* [System Architecture & H3 Specifications](docs/ARCHITECTURE.md)
* [v1 REST API Reference](docs/API_REFERENCE.md)
* [User Guide & Persona Workflows](docs/USER_GUIDE.md)

---

## 📄 License

This project is open-source and distributed under the [MIT License](LICENSE).
