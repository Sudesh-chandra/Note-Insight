import { useParams, useNavigate } from "react-router-dom";
import { useAnalysis } from "../hooks/useAnalysis";
import { AnalysisView } from "../components/Analysis/AnalysisView";
import { ReviewEditor } from "../components/Analysis/ReviewEditor";
import { EvidenceHighlight } from "../components/Analysis/EvidenceHighlight";
import { LoadingSpinner, ErrorMessage } from "../components/Layout/LoadingStates";
import { useState } from "react";

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { note, loading, error, refresh } = useAnalysis(noteId || "");
  const [showReview, setShowReview] = useState(false);
  const [highlightedConditionIndex, setHighlightedConditionIndex] = useState<number | null>(null);

  if (loading) {
    return <LoadingSpinner message="Loading analysis..." />;
  }

  if (error || !note) {
    return (
      <ErrorMessage
        message={error || "Note not found"}
        onRetry={() => navigate("/")}
      />
    );
  }

  const analysis = note.latest_analysis;
  const conditions = analysis?.reviewed_conditions || analysis?.ai_conditions || [];

  return (
    <div className="note-detail">
      <button onClick={() => navigate("/")} className="btn btn-outline btn-sm back-btn">
        &larr; Back to Notes
      </button>

      {/* Original Note with Evidence Highlighting */}
      <section className="note-text-section">
        <h2>Clinical Note</h2>
        <div className="note-meta">
          {note.pseudonym && <span>Patient: {note.pseudonym}</span>}
          {note.visit_date && <span>Visit: {note.visit_date}</span>}
          <span>Submitted: {new Date(note.created_at).toLocaleDateString()}</span>
        </div>
        {analysis && conditions.length > 0 ? (
          <EvidenceHighlight
            noteText={note.raw_text}
            conditions={conditions}
            highlightedConditionIndex={highlightedConditionIndex}
            onConditionHover={setHighlightedConditionIndex}
          />
        ) : (
          <pre className="note-text">{note.raw_text}</pre>
        )}
        {analysis && conditions.length > 0 && (
          <p className="highlight-hint">
            Hover over a condition card below to highlight its evidence quote in the note.
          </p>
        )}
      </section>

      {/* Analysis Results */}
      {analysis && (
        <>
          {showReview ? (
            <ReviewEditor
              noteId={note.id}
              analysis={analysis}
              onSave={() => {
                setShowReview(false);
                refresh();
              }}
              onCancel={() => setShowReview(false)}
            />
          ) : (
            <AnalysisView
              analysis={analysis}
              onEditReview={() => setShowReview(true)}
              onConditionHover={setHighlightedConditionIndex}
              highlightedConditionIndex={highlightedConditionIndex}
            />
          )}
        </>
      )}
    </div>
  );
}
