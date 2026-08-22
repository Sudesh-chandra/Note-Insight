"""Tests for Pydantic schema validation — ensures structured AI output is correctly validated."""

import pytest
from pydantic import ValidationError

from app.models import (
    Condition,
    DocumentationGap,
    QuoteValidation,
    NoteSubmission,
    ReviewSubmission,
    AnalysisResponse,
    MetricsResponse,
)


class TestConditionSchema:
    """Validate the Condition Pydantic model enforces all constraints."""

    def test_valid_condition(self):
        c = Condition(
            name="Hypertension",
            evidence_quote="history of hypertension",
            documentation_status="well_documented",
            icd10_code="I10",
            confidence=0.85,
        )
        assert c.name == "Hypertension"
        assert c.confidence == 0.85

    def test_valid_statuses(self):
        """All three documentation_status literals should be accepted."""
        for status in ["well_documented", "ambiguous", "mentioned_without_assessment"]:
            c = Condition(
                name="Test", evidence_quote="quote", documentation_status=status,
                icd10_code="A00", confidence=0.5,
            )
            assert c.documentation_status == status

    def test_invalid_status_rejected(self):
        """Invalid documentation_status should raise ValidationError."""
        with pytest.raises(ValidationError):
            Condition(
                name="Test", evidence_quote="quote",
                documentation_status="invalid_status",
                icd10_code="A00", confidence=0.5,
            )

    def test_confidence_bounds(self):
        """Confidence must be between 0.0 and 1.0."""
        with pytest.raises(ValidationError):
            Condition(
                name="Test", evidence_quote="quote",
                documentation_status="well_documented",
                icd10_code="A00", confidence=1.5,
            )
        with pytest.raises(ValidationError):
            Condition(
                name="Test", evidence_quote="quote",
                documentation_status="well_documented",
                icd10_code="A00", confidence=-0.1,
            )

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            Condition(
                name="", evidence_quote="quote",
                documentation_status="well_documented",
                icd10_code="A00", confidence=0.5,
            )

    def test_empty_evidence_quote_rejected(self):
        with pytest.raises(ValidationError):
            Condition(
                name="Test", evidence_quote="",
                documentation_status="well_documented",
                icd10_code="A00", confidence=0.5,
            )

    def test_empty_icd10_rejected(self):
        with pytest.raises(ValidationError):
            Condition(
                name="Test", evidence_quote="quote",
                documentation_status="well_documented",
                icd10_code="", confidence=0.5,
            )


class TestDocumentationGapSchema:
    def test_valid_gap(self):
        gap = DocumentationGap(description="Missing renal function assessment", severity="high")
        assert gap.severity == "high"

    def test_invalid_severity_rejected(self):
        with pytest.raises(ValidationError):
            DocumentationGap(description="Test", severity="critical")

    def test_empty_description_rejected(self):
        with pytest.raises(ValidationError):
            DocumentationGap(description="", severity="low")


class TestNoteSubmissionSchema:
    def test_valid_submission(self):
        sub = NoteSubmission(raw_text="A" * 10)
        assert len(sub.raw_text) == 10

    def test_too_short_rejected(self):
        with pytest.raises(ValidationError):
            NoteSubmission(raw_text="short")

    def test_too_long_rejected(self):
        with pytest.raises(ValidationError):
            NoteSubmission(raw_text="A" * 30001)

    def test_optional_fields(self):
        sub = NoteSubmission(raw_text="A" * 10, pseudonym="JD", visit_date="2024-01-01")
        assert sub.pseudonym == "JD"


class TestReviewSubmissionSchema:
    def test_valid_review(self, sample_condition, sample_gap):
        review = ReviewSubmission(
            conditions=[sample_condition],
            gaps=[sample_gap],
            summary="Patient has multiple chronic conditions.",
        )
        assert len(review.conditions) == 1
        assert len(review.gaps) == 1

    def test_empty_summary_rejected(self, sample_condition, sample_gap):
        with pytest.raises(ValidationError):
            ReviewSubmission(conditions=[], gaps=[], summary="")


class TestMetricsResponseSchema:
    def test_valid_metrics(self):
        m = MetricsResponse(
            total_notes=5,
            total_analyses=5,
            reviewed_count=3,
            pending_count=2,
            correction_rate=0.25,
            conditions_added=2,
            conditions_removed=1,
            conditions_modified=3,
            corrections_by_field={"name": 1, "icd10_code": 2, "documentation_status": 0, "evidence_quote": 0, "confidence": 0},
            gaps_added=1,
            gaps_removed=0,
        )
        assert m.correction_rate == 0.25
        assert m.total_notes == 5
