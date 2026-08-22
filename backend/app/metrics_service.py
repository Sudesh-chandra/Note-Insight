"""Metrics aggregation service — computes clinician correction statistics."""

import logging
from typing import Optional

from firebase_admin import firestore

logger = logging.getLogger(__name__)


def get_user_metrics(db: firestore.Client, user_id: str) -> dict:
    """Compute aggregated metrics for a user's notes and reviews.

    Returns:
    {
        "total_notes": int,
        "total_analyses": int,
        "reviewed_count": int,
        "pending_count": int,
        "correction_rate": float,  # 0.0 - 1.0
        "conditions_added": int,
        "conditions_removed": int,
        "conditions_modified": int,
        "corrections_by_field": {
            "name": int,
            "icd10_code": int,
            "documentation_status": int,
            "evidence_quote": int,
            "confidence": int,
        },
        "gaps_added": int,
        "gaps_removed": int,
    }
    """
    # Get all notes for user
    notes_ref = db.collection("notes").where("userId", "==", user_id)
    notes = list(notes_ref.stream())
    total_notes = len(notes)

    total_analyses = 0
    reviewed_count = 0
    pending_count = 0
    conditions_added = 0
    conditions_removed = 0
    conditions_modified = 0
    corrections_by_field = {
        "name": 0,
        "icd10_code": 0,
        "documentation_status": 0,
        "evidence_quote": 0,
        "confidence": 0,
    }
    gaps_added = 0
    gaps_removed = 0

    for note_doc in notes:
        note_id = note_doc.id
        analyses_ref = (
            db.collection("notes")
            .document(note_id)
            .collection("analyses")
            .where("userId", "==", user_id)
        )
        for analysis_doc in analyses_ref.stream():
            total_analyses += 1
            data = analysis_doc.to_dict()
            status = data.get("reviewStatus", "pending")

            if status == "reviewed":
                reviewed_count += 1
                ai_conditions = data.get("aiConditions") or []
                reviewed_conditions = data.get("reviewedConditions") or []

                # Count added conditions (in reviewed but not in AI by name)
                ai_names = {c.get("name", "").lower() for c in ai_conditions}
                reviewed_names = {c.get("name", "").lower() for c in reviewed_conditions}

                conditions_added += len(reviewed_names - ai_names)
                conditions_removed += len(ai_names - reviewed_names)

                # Count modified conditions (same name, different fields)
                ai_by_name = {c.get("name", "").lower(): c for c in ai_conditions}
                reviewed_by_name = {c.get("name", "").lower(): c for c in reviewed_conditions}

                for name in ai_names & reviewed_names:
                    ai_c = ai_by_name.get(name, {})
                    rev_c = reviewed_by_name.get(name, {})
                    for field in corrections_by_field:
                        if ai_c.get(field) != rev_c.get(field):
                            corrections_by_field[field] += 1
                            conditions_modified += 1
                            break  # count once per condition

                # Gap changes
                ai_gaps = data.get("aiGaps") or []
                reviewed_gaps = data.get("reviewedGaps") or []
                gaps_added += max(0, len(reviewed_gaps) - len(ai_gaps))
                gaps_removed += max(0, len(ai_gaps) - len(reviewed_gaps))
            else:
                pending_count += 1

    # Correction rate: proportion of reviewed analyses that had any change
    if reviewed_count > 0:
        total_changes = conditions_added + conditions_removed + conditions_modified
        correction_rate = min(1.0, total_changes / max(1, reviewed_count * 3))
    else:
        correction_rate = 0.0

    return {
        "total_notes": total_notes,
        "total_analyses": total_analyses,
        "reviewed_count": reviewed_count,
        "pending_count": pending_count,
        "correction_rate": round(correction_rate, 4),
        "conditions_added": conditions_added,
        "conditions_removed": conditions_removed,
        "conditions_modified": conditions_modified,
        "corrections_by_field": corrections_by_field,
        "gaps_added": gaps_added,
        "gaps_removed": gaps_removed,
    }
