"""Dependency injection for FastAPI route handlers."""

from typing import Generator
from sqlalchemy.orm import Session
from backend.app.db.session import get_db

__all__ = ["get_db"]
