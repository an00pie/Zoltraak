"""Aggregated v1 API router."""

from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.stations import router as stations_router
from backend.app.api.v1.ingestion import router as ingestion_router
from backend.app.api.v1.geo import router as geo_router
from backend.app.api.v1.routing import router as routing_router
from backend.app.api.v1.community_chargers import router as community_chargers_router
from backend.app.api.v1.reports import router as reports_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(stations_router)
api_v1_router.include_router(ingestion_router)
api_v1_router.include_router(geo_router)
api_v1_router.include_router(routing_router)
api_v1_router.include_router(community_chargers_router)
api_v1_router.include_router(reports_router)

__all__ = ["api_v1_router"]
