import firebase_admin
from firebase_admin import firestore
from datetime import datetime, timezone
from typing import Optional

if not firebase_admin._apps:
    raise RuntimeError("Firebase must be initialized before importing db")

db = firestore.client()


def create_note(
    user_id: str,
    raw_text: str,
    pseudonym: Optional[str],
    visit_date: Optional[str],
) -> str:
    """Create a new clinical note document. Returns the note ID."""
    now = datetime.now(timezone.utc)
    doc_ref = db.collection("notes").document()
    doc_ref.set(
        {
            "userId": user_id,
            "rawText": raw_text,
            "pseudonym": pseudonym,
            "visitDate": visit_date,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    return doc_ref.id


def create_analysis(note_id: str, user_id: str, analysis_data: dict) -> str:
    """Create an analysis subcollection document under a note. Returns analysis ID."""
    now = datetime.now(timezone.utc)
    doc_ref = (
        db.collection("notes")
        .document(note_id)
        .collection("analyses")
        .document()
    )
    doc_ref.set(
        {
            "noteId": note_id,
            "userId": user_id,
            "aiConditions": [c.model_dump() for c in analysis_data["conditions"]],
            "aiGaps": [g.model_dump() for g in analysis_data["gaps"]],
            "aiSummary": analysis_data["summary"],
            "modelVersion": analysis_data["model_version"],
            "promptVersion": analysis_data["prompt_version"],
            "quoteValidation": [q.model_dump() for q in analysis_data["quote_validation"]],
            "status": analysis_data["status"],
            "createdAt": now,
            "reviewedConditions": None,
            "reviewedGaps": None,
            "reviewedSummary": None,
            "reviewStatus": "pending",
            "reviewedAt": None,
        }
    )
    return doc_ref.id


def update_analysis_review(
    note_id: str, analysis_id: str, user_id: str, review_data: dict
) -> None:
    """Save the human clinician's corrections to an analysis."""
    now = datetime.now(timezone.utc)
    doc_ref = (
        db.collection("notes")
        .document(note_id)
        .collection("analyses")
        .document(analysis_id)
    )
    doc_ref.update(
        {
            "reviewedConditions": review_data["conditions"],
            "reviewedGaps": review_data["gaps"],
            "reviewedSummary": review_data["summary"],
            "reviewStatus": "reviewed",
            "reviewedAt": now,
        }
    )


def get_note(note_id: str, user_id: str) -> Optional[dict]:
    """Get a note by ID, verifying ownership. Returns None if not found or not owned."""
    doc = db.collection("notes").document(note_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    if data.get("userId") != user_id:
        return None
    return {"id": doc.id, **data}


def get_analyses_for_note(note_id: str, user_id: str) -> list[dict]:
    """Get all analyses for a note, newest first, filtered by user ownership."""
    analyses = (
        db.collection("notes")
        .document(note_id)
        .collection("analyses")
        .where("userId", "==", user_id)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .stream()
    )
    results = []
    for doc in analyses:
        results.append({"id": doc.id, **doc.to_dict()})
    return results


def get_latest_analysis(note_id: str, user_id: str) -> Optional[dict]:
    """Get the most recent analysis for a note."""
    analyses = (
        db.collection("notes")
        .document(note_id)
        .collection("analyses")
        .where("userId", "==", user_id)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    for doc in analyses:
        return {"id": doc.id, **doc.to_dict()}
    return None


def get_notes_for_user(user_id: str) -> list[dict]:
    """Get all notes for a user, newest first, with lightweight analysis info."""
    docs = (
        db.collection("notes")
        .where("userId", "==", user_id)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .stream()
    )
    results = []
    for doc in docs:
        note_data = {"id": doc.id, **doc.to_dict()}
        latest = get_latest_analysis(doc.id, user_id)
        if latest:
            conditions = latest.get("reviewedConditions") or latest.get("aiConditions", [])
            note_data["condition_count"] = len(conditions)
            note_data["review_status"] = latest.get("reviewStatus", "pending")
        else:
            note_data["condition_count"] = 0
            note_data["review_status"] = "pending"
        results.append(note_data)
    return results
