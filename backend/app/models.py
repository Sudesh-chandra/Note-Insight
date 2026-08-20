from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal


# --- Shared sub-models ---


class Condition(BaseModel):
    """A medical condition extracted from a clinical note."""
    name: str = Field(min_length=1, description="Medical condition name")
    evidence_quote: str = Field(min_length=1, description="Verbatim quote from the note")
    documentation_status: Literal[
        "well_documented", "ambiguous", "mentioned_without_assessment"
    ]
    icd10_code: str = Field(min_length=1, description="Approximate ICD-10 code")
    confidence: float = Field(ge=0.0, le=1.0, description="AI confidence score")


class DocumentationGap(BaseModel):
    """An actionable observation about missing or incomplete documentation."""
    description: str = Field(min_length=1)
    severity: Literal["high", "medium", "low"]


class QuoteValidation(BaseModel):
    """Result of checking whether an evidence quote actually exists in the note."""
    condition_name: str
    evidence_quote: str
    found_in_note: bool  # False = hallucinated quote


# --- Request models ---


class NoteSubmission(BaseModel):
    """Incoming clinical note from the frontend."""
    raw_text: str = Field(min_length=10, max_length=30000)
    pseudonym: Optional[str] = Field(None, max_length=100)
    visit_date: Optional[str] = None  # ISO format YYYY-MM-DD


class ReviewSubmission(BaseModel):
    """Human clinician's corrections to an AI analysis."""
    conditions: list[Condition]
    gaps: list[DocumentationGap]
    summary: str = Field(min_length=1)


# --- Response models ---


class AnalysisResponse(BaseModel):
    """Full analysis response (both AI output and human review)."""
    model_config = ConfigDict(protected_namespaces=())

    id: str
    note_id: str
    # Machine-written
    ai_conditions: list[Condition]
    ai_gaps: list[DocumentationGap]
    ai_summary: str
    model_version: str
    prompt_version: str
    quote_validation: list[QuoteValidation]
    status: Literal["processing", "completed", "failed"]
    created_at: str
    # Human-written (null until reviewed)
    reviewed_conditions: Optional[list[Condition]] = None
    reviewed_gaps: Optional[list[DocumentationGap]] = None
    reviewed_summary: Optional[str] = None
    review_status: Literal["pending", "reviewed"]
    reviewed_at: Optional[str] = None


class NoteListItem(BaseModel):
    """Lightweight note representation for the history list."""
    id: str
    pseudonym: Optional[str]
    visit_date: Optional[str]
    created_at: str
    condition_count: int
    review_status: Literal["pending", "reviewed"]


class NoteDetailResponse(BaseModel):
    """Full note with all analyses."""
    id: str
    raw_text: str
    pseudonym: Optional[str]
    visit_date: Optional[str]
    created_at: str
    latest_analysis: Optional[AnalysisResponse] = None
    all_analyses: list[AnalysisResponse]


class NoteCreateResponse(BaseModel):
    """Response after creating a note and triggering analysis."""
    note_id: str
    analysis_id: str
    status: str
