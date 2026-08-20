from fastapi import APIRouter, Depends, HTTPException
import logging

from app.auth import get_current_user
from app.models import ReviewSubmission
from app.db import update_analysis_review, get_note

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analyses", tags=["analyses"])


@router.put("/{note_id}/{analysis_id}/review")
async def submit_review(
    note_id: str,
    analysis_id: str,
    review: ReviewSubmission,
    user_id: str = Depends(get_current_user),
):
    """Save the clinician's review/corrections of an AI analysis."""
    # Verify ownership of the parent note
    note = get_note(note_id, user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_analysis_review(note_id, analysis_id, user_id, review.model_dump())
    logger.info(f"Review saved for analysis {analysis_id}: {len(review.conditions)} conditions")
    return {"status": "review_saved"}
