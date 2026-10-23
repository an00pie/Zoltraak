# ⚡ Zoltraak

> **EV charging-aware route planner for India with Uber H3 spatial indexing and Open Charge Map data pipelines.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Uber H3](https://img.shields.io/badge/H3-Discrete_Spatial_Index-orange.svg?style=flat-square)](https://h3geo.org/)
[![Database](https://img.shields.io/badge/DB-PostgreSQL%20%7C%20SQLite-indigo.svg?style=flat-square)](https://www.sqlalchemy.org/)
[![Tests](https://img.shields.io/badge/Tests-25%2F25%20Passing-brightgreen.svg?style=flat-square)](tests)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 📌 Project Overview

Zoltraak is an intelligent Electric Vehicle (EV) charging-aware route planner designed specifically for Indian highway corridors and urban driving. It accounts for real-world battery discharge curves, terrain gradients, vehicle specifications, charging station availability, and en-route corridor discovery.

Development follows a strict **phase-by-phase iteration model**. This repository contains the complete implementation and verified deliverables for **Phase 1: Foundation and H3 Charging Dataset Pipeline**.

---

## 🏗️ Architecture & Technology Stack (Phase 1)

* **Backend Engine:** Python 3.11+ with [FastAPI](https://fastapi.tiangolo.com) for high-performance async REST APIs.
* **Spatial Indexing:** [Uber H3](https://h3geo.org/) discrete global grid system (Resolution 8 by default: ~0.74 km² area, ~461m hexagon edge).
* **Database & ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 with unified support for:
  * **PostgreSQL + PostGIS** for production and geospatial operations.
  * **SQLite** (local file or `:memory:`) for zero-dependency local runs and automated CI.
* **Station Directory Source:** [Open Charge Map (OCM) v3 API](https://openchargemap.io/site/develop/api) with offline sample India fixtures.
* **Validation & Types:** [Pydantic v2](https://docs.pydantic.dev/) and `pydantic-settings`.
* **Testing:** [Pytest](https://pytest.org/) and FastAPI `TestClient`.

---

## 📁 Repository Structure

```
zoltraak/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                  # Database dependency injection
│   │   │   └── v1/
│   │   │       ├── health.py            # Liveness & DB connectivity probe
│   │   │       ├── stations.py          # Spatial H3 & attribute filtered queries
│   │   │       ├── ingestion.py         # Batch sync trigger & audit logs
│   │   │       └── router.py            # Aggregated v1 router
│   │   ├── core/
│   │   │   └── config.py                # Pydantic environment configuration
│   │   ├── db/
│   │   │   ├── models.py                # SQLAlchemy models (Station, Connector, IngestionRun)
│   │   │   └── session.py               # Engine & session management (SQLite / Postgres)
│   │   ├── ingestion/
│   │   │   ├── client.py                # Open Charge Map HTTP client & fixture loader
│   │   │   ├── h3_indexer.py            # Uber H3 indexing, validation & disk neighbors
│   │   │   ├── normalizer.py            # Data cleaning, status & connector mapping
│   │   │   └── pipeline.py              # Idempotent upsert & transaction orchestrator
│   │   ├── schemas/
│   │   │   ├── station.py               # Pydantic response DTOs
│   │   │   └── ingestion.py             # Ingestion request / response schemas
│   │   └── main.py                      # FastAPI application entrypoint with CORS
│   └── scripts/
│       └── ingest.py                    # CLI ingestion tool with formatted reports
├── data/
│   ├── fixtures/
│   │   └── sample_ocm_india.json        # Curated real-world Indian charging station data
│   └── zoltraak.db                      # Local SQLite database (git-ignored)
├── tests/
│   ├── conftest.py                      # Test database & client fixtures
│   ├── test_h3_indexer.py               # 7 H3 unit tests (coords, disk, polygon, bounds)
│   ├── test_normalizer.py               # 8 normalizer unit tests (connectors, errors, dates)
│   ├── test_pipeline.py                 # 4 pipeline integration tests (upsert, idempotency)
│   └── test_api.py                      # 6 API route integration tests
├── .env.example                         # Environment configuration template
├── .gitignore                           # Git ignore rules
└── pyproject.toml                       # Python package metadata & dependencies
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
* Python `3.11+`
* `uv` (recommended) or `pip` / `virtualenv`

### 2. Environment Setup
```bash
# Clone or navigate to the repository
cd ~/Downloads/zoltraak

# Create and activate virtual environment using uv
uv venv --python 3.11 .venv
source .venv/bin/activate

# Install dependencies
uv pip install -e ".[dev]"
# Or with standard pip:
pip install -e ".[dev]"
```

### 3. Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Default configuration runs with local SQLite (`./data/zoltraak.db`) and requires zero setup.
To point to a live PostgreSQL + PostGIS instance:
```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/zoltraak_db
```
To query the live Open Charge Map API:
```env
OCM_API_KEY=your_open_charge_map_api_key
```

---

## 🚀 Running Ingestion

### Option A: Using Built-in Indian Charging Stations Fixture (No API Key Required)
```bash
python backend/scripts/ingest.py --sample
```
Output:
```text
=======================================================
 ⚡ Zoltraak — EV Charging Data Ingestion Pipeline
=======================================================
 Target Country : IN
 Max Results    : 100
 H3 Resolution  : 8
 Data Source    : Fixture: /home/.../data/fixtures/sample_ocm_india.json
 Database       : sqlite:///./data/zoltraak.db
-------------------------------------------------------
 Ingestion Completed Successfully!
 Ingestion Run ID   : #1
 Status             : COMPLETED
 Records Fetched    : 6
 Records Inserted   : 4
 Records Updated    : 0
 Records Skipped    : 2
-------------------------------------------------------
 Sample Indexed Stations in Database:
 • [ID 190004] KSEB EV Charging Station - Palakkad | H3: 8860317857fffff | CCS2 (50.0kW), GB/T (15.0kW)
 • [ID 190003] Jio-bp pulse - Koramangala Outer Ri | H3: 88618925e9fffff | CCS2 (60.0kW), CHAdeMO (50.0kW)
 • [ID 190002] Zeon Charging - Mysore Road Express | H3: 886014569bfffff | CCS2 (120.0kW)
 • [ID 190001] Tata Power - Electronic City Hub    | H3: 886189266bfffff | CCS2 (60.0kW), Type 2 (22.0kW)
=======================================================
```

### Option B: Querying Live Open Charge Map API
```bash
python backend/scripts/ingest.py --country IN --max-results 100
```

### Option C: Verifying Idempotent Repeated Ingestion
Run the ingestion command a second time:
```bash
python backend/scripts/ingest.py --sample
```
> Notice: `Records Inserted: 0, Records Updated: 4`. The database updates existing records instead of generating duplicate entries.

---

## 🌐 Running the FastAPI Backend Server

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
* **Interactive OpenAPI Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Probe:** [http://localhost:8000/health](http://localhost:8000/health)

### Example API Queries

* **List all stations with pagination:**
  ```bash
  curl -s "http://localhost:8000/api/v1/stations?page=1&page_size=10"
  ```
* **Filter stations by H3 Spatial Cell Index:**
  ```bash
  curl -s "http://localhost:8000/api/v1/stations?h3_cell=886189266bfffff"
  ```
* **Filter by H3 Cell with k-ring neighbor search (disk radius = 1):**
  ```bash
  curl -s "http://localhost:8000/api/v1/stations?h3_cell=886189266bfffff&h3_disk_radius=1"
  ```
* **Filter by connector type and minimum power:**
  ```bash
  curl -s "http://localhost:8000/api/v1/stations?connector_type=CCS2&min_power_kw=50"
  ```
* **Get single station details with connectors:**
  ```bash
  curl -s "http://localhost:8000/api/v1/stations/1"
  ```
* **View audit history of ingestion runs:**
  ```bash
  curl -s "http://localhost:8000/api/v1/ingestion/runs"
  ```

---

## 🧪 Running Automated Tests

Run the full automated test suite covering H3 indexing, normalization, pipeline idempotency, and REST API routes:

```bash
pytest -v
```

All 25 tests pass in $< 0.5$ seconds:
```text
tests/test_api.py::TestAPI::test_health_check PASSED
tests/test_api.py::TestAPI::test_list_stations_empty PASSED
tests/test_api.py::TestAPI::test_list_stations_and_filtering PASSED
tests/test_api.py::TestAPI::test_get_station_by_id PASSED
tests/test_api.py::TestAPI::test_trigger_ingestion_api_with_fixture PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_coordinate_to_h3_valid PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_coordinate_to_h3_resolutions PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_is_valid_coordinate PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_coordinate_to_h3_invalid_raises_value_error PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_h3_to_coordinate PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_h3_to_coordinate_invalid_raises PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_get_h3_disk PASSED
tests/test_h3_indexer.py::TestH3SpatialIndexer::test_h3_to_polygon_coordinates PASSED
tests/test_normalizer.py::TestStationNormalizer::test_normalize_valid_station PASSED
tests/test_normalizer.py::TestStationNormalizer::test_normalize_malformed_missing_latitude PASSED
tests/test_normalizer.py::TestStationNormalizer::test_normalize_malformed_out_of_range_coordinates PASSED
tests/test_normalizer.py::TestStationNormalizer::test_normalize_missing_id PASSED
tests/test_normalizer.py::TestStationNormalizer::test_normalize_missing_address_info PASSED
tests/test_normalizer.py::TestStationNormalizer::test_connector_mapping_standard_ids PASSED
tests/test_normalizer.py::TestStationNormalizer::test_operational_status_mapping PASSED
tests/test_normalizer.py::TestStationNormalizer::test_parse_datetime PASSED
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_ingest_from_raw_records PASSED
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_idempotency_no_duplicates PASSED
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_updates_modified_fields PASSED
tests/test_pipeline.py::TestIngestionPipeline::test_pipeline_records_ingestion_run_audit PASSED

======================== 25 passed in 0.31s ========================
```

---

## 🔒 Acceptance Criteria Verification (Phase 1)

| Requirement | Acceptance Criteria | Verification Status |
| :--- | :--- | :---: |
| **Ingestion Process** | Works using documented configuration (`.env`, CLI `--sample` or `--country IN`). | ✅ Verified |
| **Database Persistence** | Imported station records & connectors persist in relational tables (`stations`, `station_connectors`). | ✅ Verified |
| **Uber H3 Indexing** | Every valid station has an accurate H3 index (`h3_cell`, resolution 8). | ✅ Verified |
| **Idempotency** | Repeated ingestion updates records without creating duplicates (`UniqueConstraint('source', 'source_id')`). | ✅ Verified |
| **Error Handling** | Malformed data (missing lat/long, out-of-range coords, missing IDs) safely skipped and logged. | ✅ Verified |
| **Automated Testing** | Comprehensive automated tests verify normalizer, H3 indexer, pipeline, and API endpoints. | ✅ 25/25 Passing |
