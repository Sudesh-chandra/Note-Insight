// Shared types — these mirror the backend Pydantic models exactly.
// No `any` allowed. Every field is explicit.

export interface Condition {
  name: string;
  evidence_quote: string;
  documentation_status: "well_documented" | "ambiguous" | "mentioned_without_assessment";
  icd10_code: string;
  confidence: number;
}

export interface DocumentationGap {
  description: string;
  severity: "high" | "medium" | "low";
}

export interface QuoteValidation {
  condition_name: string;
  evidence_quote: string;
  found_in_note: boolean;
}

export interface Analysis {
  id: string;
  note_id: string;
  // Machine-written fields
  ai_conditions: Condition[];
  ai_gaps: DocumentationGap[];
  ai_summary: string;
  model_version: string;
  prompt_version: string;
  quote_validation: QuoteValidation[];
  status: "processing" | "completed" | "failed";
  created_at: string;
  // Human-written fields (null until reviewed)
  reviewed_conditions: Condition[] | null;
  reviewed_gaps: DocumentationGap[] | null;
  reviewed_summary: string | null;
  review_status: "pending" | "reviewed";
  reviewed_at: string | null;
}

export interface NoteListItem {
  id: string;
  pseudonym: string | null;
  visit_date: string | null;
  created_at: string;
  condition_count: number;
  review_status: "pending" | "reviewed";
}

export interface NoteDetail {
  id: string;
  raw_text: string;
  pseudonym: string | null;
  visit_date: string | null;
  created_at: string;
  latest_analysis: Analysis | null;
  all_analyses: Analysis[];
}

export interface NoteCreateResponse {
  note_id: string;
  analysis_id: string;
  status: "completed" | "failed";
}

export interface ReviewSubmission {
  conditions: Condition[];
  gaps: DocumentationGap[];
  summary: string;
}
