"""Duplicate note caching service — SHA-256 hash-based cache lookup."""

import hashlib
import logging
from typing import Optional

from firebase_admin import firestore

logger = logging.getLogger(__name__)


def compute_note_hash(raw_text: str, user_id: str) -> str:
    """Compute a SHA-256 hash of normalized note text + user_id.

    Normalization: lowercase, strip whitespace, collapse internal whitespace.
    This ensures identical notes with minor formatting differences still match.
    """
    normalized = " ".join(raw_text.lower().split())
    content = f"{user_id}:{normalized}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def check_cache(db: firestore.Client, note_hash: str) -> Optional[dict]:
    """Look up a cached analysis by note hash.

    Returns the cached note+analysis dict if found, None otherwise.
    """
    docs = (
        db.collection("note_cache")
        .where("hash", "==", note_hash)
        .limit(1)
        .stream()
    )
    for doc in docs:
        return doc.to_dict()
    return None


def save_to_cache(
    db: firestore.Client,
    note_hash: str,
    user_id: str,
    note_id: str,
    analysis_id: str,
) -> None:
    """Save a note hash → analysis mapping to the cache collection."""
    db.collection("note_cache").document(note_hash).set(
        {
            "hash": note_hash,
            "userId": user_id,
            "noteId": note_id,
            "analysisId": analysis_id,
        }
    )
    logger.info(f"Cache saved for note hash {note_hash[:16]}...")
