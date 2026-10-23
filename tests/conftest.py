"""Pytest test configuration and fixtures with isolated in-memory SQLite database."""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.db.models import Base
from backend.app.api.deps import get_db
from backend.app.main import app

# In-memory test engine isolated across tests
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh isolated database schema for each test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient that uses the isolated in-memory test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_fixture_path() -> Path:
    """Return path to curated sample India OCM fixture."""
    return Path(__file__).resolve().parent.parent / "data" / "fixtures" / "sample_ocm_india.json"


@pytest.fixture
def sample_raw_data(sample_fixture_path) -> list:
    """Load sample raw JSON fixture data."""
    with open(sample_fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)
