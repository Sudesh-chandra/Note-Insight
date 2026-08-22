from fastapi import APIRouter, Depends, HTTPException
import logging

from app.auth import get_current_user
from app.models import MetricsResponse
from app.metrics_service import get_user_metrics
from app.db import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("", response_model=MetricsResponse)
async def get_metrics(user_id: str = Depends(get_current_user)):
    """Get aggregated clinician correction metrics for the authenticated user."""
    try:
        metrics = get_user_metrics(db, user_id)
        return MetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"Metrics computation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute metrics.")
