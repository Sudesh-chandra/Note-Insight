"""Tests for hallucination detection — quote validation ensures evidence traces to source."""

import pytest
from app.models import Condition, QuoteValidation
from app.gemini_service import validate_quotes


class TestQuoteValidation:
    """Verify that the traceability guardrail correctly identifies real vs. hallucinated quotes."""

    def test_exact_quote_found(self, sample_note_text):
        """A verbatim substring should be found."""
        condition = Condition(
            name="Hypertension",
            evidence_quote="history of hypertension managed with lisinopril 10mg daily",
            documentation_status="well_documented",
            icd10_code="I10",
            confidence=0.9,
        )
        results = validate_quotes([condition], sample_note_text)
        assert len(results) == 1
        assert results[0].found_in_note is True

    def test_whitespace_variation_found(self, sample_note_text):
        """Quotes with extra/different whitespace should still match after normalization."""
        condition = Condition(
            name="Hypertension",
            evidence_quote="Patient  has   a  history of  hypertension",
            documentation_status="well_documented",
            icd10_code="I10",
            confidence=0.9,
        )
        results = validate_quotes([condition], sample_note_text)
        assert results[0].found_in_note is True

    def test_hallucinated_quote_not_found(self, sample_note_text):
        """A fabricated quote should be flagged as not found."""
        condition = Condition(
            name="Fake Condition",
            evidence_quote="The patient was diagnosed with a rare tropical disease.",
            documentation_status="well_documented",
            icd10_code="B99",
            confidence=0.3,
        )
        results = validate_quotes([condition], sample_note_text)
        assert results[0].found_in_note is False

    def test_case_sensitive_matching(self, sample_note_text):
        """Matching should be case-sensitive (normalization only affects whitespace)."""
        condition = Condition(
            name="Test",
            evidence_quote="PATIENT HAS A HISTORY OF HYPERTENSION",
            documentation_status="ambiguous",
            icd10_code="I10",
            confidence=0.5,
        )
        results = validate_quotes([condition], sample_note_text)
        # The note has lowercase, so uppercase should NOT match
        assert results[0].found_in_note is False

    def test_multiple_conditions_validated(self, sample_note_text):
        """All conditions should be validated independently."""
        conditions = [
            Condition(
                name="Hypertension",
                evidence_quote="history of hypertension managed with lisinopril 10mg daily",
                documentation_status="well_documented",
                icd10_code="I10",
                confidence=0.9,
            ),
            Condition(
                name="Diabetes",
                evidence_quote="Type 2 diabetes mellitus, currently on metformin 500mg BID",
                documentation_status="well_documented",
                icd10_code="E11",
                confidence=0.88,
            ),
            Condition(
                name="Fabricated",
                evidence_quote="This text does not appear anywhere in the note",
                documentation_status="ambiguous",
                icd10_code="Z99",
                confidence=0.2,
            ),
        ]
        results = validate_quotes(conditions, sample_note_text)
        assert len(results) == 3
        assert results[0].found_in_note is True
        assert results[1].found_in_note is True
        assert results[2].found_in_note is False

    def test_empty_conditions_list(self, sample_note_text):
        """Empty condition list should return empty validation list."""
        results = validate_quotes([], sample_note_text)
        assert results == []

    def test_partial_quote_found(self, sample_note_text):
        """A short but valid substring should match."""
        condition = Condition(
            name="Insomnia",
            evidence_quote="difficulty sleeping",
            documentation_status="well_documented",
            icd10_code="G47.0",
            confidence=0.8,
        )
        results = validate_quotes([condition], sample_note_text)
        assert results[0].found_in_note is True

    def test_completely_wrong_note(self):
        """Quote from a different note should not match."""
        condition = Condition(
            name="Hypertension",
            evidence_quote="BP 120/80, normal sinus rhythm",
            documentation_status="well_documented",
            icd10_code="I10",
            confidence=0.9,
        )
        different_note = "Patient presents with acute appendicitis. No prior surgical history."
        results = validate_quotes([condition], different_note)
        assert results[0].found_in_note is False
