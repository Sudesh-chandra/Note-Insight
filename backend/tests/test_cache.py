"""Tests for the duplicate note caching service — SHA-256 hash computation and lookup."""

import pytest
from app.cache_service import compute_note_hash


class TestNoteHashComputation:
    """Verify that identical notes produce the same hash, and different notes produce different hashes."""

    def test_same_text_same_user_same_hash(self):
        """Identical note text from the same user should always produce the same hash."""
        h1 = compute_note_hash("Patient has hypertension", "user123")
        h2 = compute_note_hash("Patient has hypertension", "user123")
        assert h1 == h2

    def test_different_text_different_hash(self):
        """Different note text should produce different hashes."""
        h1 = compute_note_hash("Patient has hypertension", "user123")
        h2 = compute_note_hash("Patient has diabetes", "user123")
        assert h1 != h2

    def test_same_text_different_user_different_hash(self):
        """Same note text from different users should produce different hashes (tenant isolation)."""
        h1 = compute_note_hash("Patient has hypertension", "user123")
        h2 = compute_note_hash("Patient has hypertension", "user456")
        assert h1 != h2

    def test_whitespace_normalization(self):
        """Notes differing only by whitespace/case should hash identically."""
        h1 = compute_note_hash("Patient  has\n\thypertension", "user123")
        h2 = compute_note_hash("patient has hypertension", "user123")
        assert h1 == h2

    def test_hash_is_hex_sha256(self):
        """Hash should be a 64-character hex string (SHA-256)."""
        h = compute_note_hash("test note", "user1")
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_empty_text_hash(self):
        """Even empty text should produce a valid hash (not crash)."""
        h = compute_note_hash("", "user1")
        assert len(h) == 64
