from fastapi import APIRouter, Depends, HTTPException
from google.api_core.exceptions import FailedPrecondition
import logging
import re

from app.auth import get_current_user
from app.models import (
    NoteSubmission,
    NoteCreateResponse,
    NoteListItem,
    NoteDetailResponse,
)
from app.db import (
    create_note,
    create_analysis,
    get_note,
    get_notes_for_user,
    get_analyses_for_note,
)
from app.gemini_service import analyze_note

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.post("", response_model=NoteCreateResponse)
async def submit_note(
    submission: NoteSubmission, user_id: str = Depends(get_current_user)
):
    """Submit a clinical note and trigger AI analysis."""
    if not submission.raw_text or not submission.raw_text.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty.")

    if len(submission.raw_text.strip()) < 10:
        raise HTTPException(
            status_code=400, detail="Note must be at least 10 characters long."
        )

    # Auto-extract pseudonym from note text if not explicitly provided
    pseudonym = submission.pseudonym
    if not pseudonym:
        pseudonym = _extract_patient_name(submission.raw_text)

    # Auto-extract visit date from note text if not explicitly provided
    visit_date = submission.visit_date
    if not visit_date:
        visit_date = _extract_visit_date(submission.raw_text)

    note_id = create_note(
        user_id, submission.raw_text, pseudonym, visit_date
    )

    # Run AI analysis (synchronous for MVP)
    analysis_data = analyze_note(submission.raw_text)
    analysis_id = create_analysis(note_id, user_id, analysis_data)

    return NoteCreateResponse(
        note_id=note_id,
        analysis_id=analysis_id,
        status=analysis_data["status"],
    )


@router.get("", response_model=list[NoteListItem])
async def list_notes(user_id: str = Depends(get_current_user)):
    """List all notes for the authenticated user, newest first."""
    try:
        notes = get_notes_for_user(user_id)
    except FailedPrecondition as e:
        logger.error(f"Firestore index missing: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database index is still building. Please wait 1-2 minutes and refresh.",
        )
    return [
        NoteListItem(
            id=n["id"],
            pseudonym=n.get("pseudonym"),
            visit_date=n.get("visitDate"),
            created_at=_format_timestamp(n["createdAt"]),
            condition_count=n["condition_count"],
            review_status=n["review_status"],
        )
        for n in notes
    ]


@router.get("/{note_id}", response_model=NoteDetailResponse)
async def get_note_detail(
    note_id: str, user_id: str = Depends(get_current_user)
):
    """Get full note detail with all analyses."""
    note = get_note(note_id, user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    try:
        analyses = get_analyses_for_note(note_id, user_id)
    except FailedPrecondition as e:
        logger.error(f"Firestore index missing: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database index is still building. Please wait 1-2 minutes and refresh.",
        )

    return NoteDetailResponse(
        id=note["id"],
        raw_text=note["rawText"],
        pseudonym=note.get("pseudonym"),
        visit_date=note.get("visitDate"),
        created_at=_format_timestamp(note["createdAt"]),
        latest_analysis=_format_analysis(analyses[0]) if analyses else None,
        all_analyses=[_format_analysis(a) for a in analyses],
    )


def _extract_patient_name(note_text: str) -> str | None:
    """Try to extract patient name from the first few lines of a clinical note."""
    # Match patterns like "Patient: Margaret Chen, 58yo Female"
    match = re.search(
        r"(?i)patient[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        note_text[:500],
    )
    if match:
        return match.group(1).strip()
    return None


def _extract_visit_date(note_text: str) -> str | None:
    """Try to extract visit date from the first few lines of a clinical note."""
    # Match patterns like "Visit Date: 2024-11-15" or "Date: 11/15/2024"
    match = re.search(
        r"(?i)(?:visit\s+)?date[:\s]+(\d{4}-\d{2}-\d{2})",
        note_text[:500],
    )
    if match:
        return match.group(1).strip()
    return None


def _format_timestamp(val) -> str:
    """Convert Firestore timestamp to ISO string."""
    if val and hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val) if val else ""


def _format_analysis(a: dict) -> dict:
    """Convert a Firestore analysis document to the API response shape."""
    reviewed_conditions = a.get("reviewedConditions")
    return {
        "id": a["id"],
        "note_id": a["noteId"],
        "ai_conditions": a.get("aiConditions", []),
        "ai_gaps": a.get("aiGaps", []),
        "ai_summary": a.get("aiSummary", ""),
        "model_version": a.get("modelVersion", ""),
        "prompt_version": a.get("promptVersion", ""),
        "quote_validation": a.get("quoteValidation", []),
        "status": a.get("status", "completed"),
        "created_at": _format_timestamp(a.get("createdAt")),
        "reviewed_conditions": reviewed_conditions,
        "reviewed_gaps": a.get("reviewedGaps"),
        "reviewed_summary": a.get("reviewedSummary"),
        "review_status": a.get("reviewStatus", "pending"),
        "reviewed_at": _format_timestamp(a.get("reviewedAt")),
    }
