"""API endpoints for triggering and inspecting data ingestion runs."""

from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.core.config import settings
from backend.app.db.models import IngestionRun
from backend.app.schemas.ingestion import IngestionRunRead, IngestionTriggerRequest
from backend.app.ingestion.pipeline import IngestionPipeline

router = APIRouter()


@router.get("/ingestion/runs", response_model=List[IngestionRunRead], tags=["Ingestion"])
def list_ingestion_runs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve audit history of data ingestion executions and sync statistics."""
    return db.query(IngestionRun).order_by(IngestionRun.id.desc()).limit(limit).all()


@router.post("/ingestion/run", response_model=IngestionRunRead, tags=["Ingestion"])
def trigger_ingestion(
    request: IngestionTriggerRequest,
    db: Session = Depends(get_db),
):
    """
    Trigger an ingestion batch.
    Supports either querying live Open Charge Map API or loading from a local fixture.
    """
    pipeline = IngestionPipeline(db=db)

    fixture_path = None
    if request.use_fixture:
        if request.fixture_path:
            fixture_path = Path(request.fixture_path)
        else:
            fixture_path = settings.DATA_DIR / "fixtures" / "sample_ocm_india.json"

        if not fixture_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fixture file not found at: {fixture_path}",
            )

    try:
        run = pipeline.run(
            country_code=request.country_code,
            max_results=request.max_results,
            fixture_path=fixture_path,
        )
        return run
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion execution failed: {e}",
        )
