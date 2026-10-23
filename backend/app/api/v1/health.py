"""Health check endpoint for liveness and database connectivity verification."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.api.deps import get_db
from backend.app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Liveness probe verifying database connectivity and configuration status."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {e}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "h3_default_resolution": settings.H3_DEFAULT_RESOLUTION,
        "ocm_configured": bool(settings.OCM_API_KEY),
    }
