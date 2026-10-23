"""Application configuration management using pydantic-settings."""

import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration settings for Zoltraak."""

    # Application details
    PROJECT_NAME: str = "Zoltraak"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # API Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Database
    # Defaults to SQLite in data/ directory for zero-dependency local runs.
    # Seamlessly supports PostgreSQL + PostGIS via:
    # DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/dbname
    DATABASE_URL: str = "sqlite:///./data/zoltraak.db"

    # Open Charge Map API
    OCM_API_KEY: Optional[str] = None
    OCM_BASE_URL: str = "https://api.openchargemap.io/v3"
    OCM_DEFAULT_COUNTRY: str = "IN"
    OCM_DEFAULT_MAX_RESULTS: int = 100
    OCM_TIMEOUT_SECONDS: float = 20.0

    # Uber H3 Spatial Indexing
    # Resolution 8 (~0.74 km² area, ~461m hexagon edge) provides optimal urban & corridor grouping
    H3_DEFAULT_RESOLUTION: int = 8

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent / "data"

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Instantiate singleton
settings = Settings()
