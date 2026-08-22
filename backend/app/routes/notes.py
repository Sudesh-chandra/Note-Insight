from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from google.api_core.exceptions import FailedPrecondition
import json
import logging
import re

from app.auth import get_current_user
from app.limiter import limiter
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
    db,
)
from app.gemini_service import analyze_note
from app.document_service import extract_text_from_upload
from app.cache_service import compute_note_hash, check_cache, save_to_cache
from app.streaming_service import stream_analysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.post("", response_model=NoteCreateResponse)
@limiter.limit("10/minute")
async def submit_note(
    request: Request,
    submission: NoteSubmission, user_id: str = Depends(get_current_user)
):
    """Submit a clinical note and trigger AI analysis."""
    if not submission.raw_text or not submission.raw_text.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty.")

    if len(submission.raw_text.strip()) < 10:
        raise HTTPException(
            status_code=400, detail="Note must be at least 10 characters long."
        )

    # Check cache for duplicate note
    note_hash = compute_note_hash(submission.raw_text, user_id)
    cached = check_cache(db, note_hash)
    if cached:
        logger.info(f"Cache hit for note hash {note_hash[:16]}...")
        return NoteCreateResponse(
            note_id=cached["noteId"],
            analysis_id=cached["analysisId"],
            status="completed",
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

    # Save to cache
    save_to_cache(db, note_hash, user_id, note_id, analysis_id)

    return NoteCreateResponse(
        note_id=note_id,
        analysis_id=analysis_id,
        status=analysis_data["status"],
    )


@router.post("/upload", response_model=NoteCreateResponse)
@limiter.limit("10/minute")
async def upload_note(
    request: Request,
    file: UploadFile = File(...),
    pseudonym: str = Form(None),
    visit_date: str = Form(None),
    user_id: str = Depends(get_current_user),
):
    """Upload a PDF or image file for text extraction and AI analysis."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    file_bytes = await file.read()

    try:
        raw_text = extract_text_from_upload(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not raw_text or len(raw_text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Extracted text is too short. Ensure the document contains readable clinical text.",
        )

    # Check cache
    note_hash = compute_note_hash(raw_text, user_id)
    cached = check_cache(db, note_hash)
    if cached:
        return NoteCreateResponse(
            note_id=cached["noteId"],
            analysis_id=cached["analysisId"],
            status="completed",
        )

    if not pseudonym:
        pseudonym = _extract_patient_name(raw_text)
    if not visit_date:
        visit_date = _extract_visit_date(raw_text)

    note_id = create_note(user_id, raw_text, pseudonym, visit_date)
    analysis_data = analyze_note(raw_text)
    analysis_id = create_analysis(note_id, user_id, analysis_data)
    save_to_cache(db, note_hash, user_id, note_id, analysis_id)

    return NoteCreateResponse(
        note_id=note_id,
        analysis_id=analysis_id,
        status=analysis_data["status"],
    )


@router.post("/analyze/stream")
async def stream_note_analysis(
    submission: NoteSubmission, user_id: str = Depends(get_current_user)
):
    """Stream AI analysis in real-time using Server-Sent Events."""
    if not submission.raw_text or not submission.raw_text.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty.")

    if len(submission.raw_text.strip()) < 10:
        raise HTTPException(
            status_code=400, detail="Note must be at least 10 characters long."
        )

    return StreamingResponse(
        _sse_generator(submission.raw_text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _sse_generator(note_text: str):
    """Convert streaming_service events to SSE format."""
    for event in stream_analysis(note_text):
        event_name = event["event"]
        data = json.dumps(event["data"])
        yield f"event: {event_name}\ndata: {data}\n\n"


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
    match = re.search(
        r"(?i)patient[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        note_text[:500],
    )
    if match:
        return match.group(1).strip()
    return None


def _extract_visit_date(note_text: str) -> str | None:
    """Try to extract visit date from the first few lines of a clinical note."""
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
