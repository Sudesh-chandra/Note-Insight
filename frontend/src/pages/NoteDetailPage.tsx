import { useParams, useNavigate } from "react-router-dom";
import { useAnalysis } from "../hooks/useAnalysis";
import { AnalysisView } from "../components/Analysis/AnalysisView";
import { ReviewEditor } from "../components/Analysis/ReviewEditor";
import { LoadingSpinner, ErrorMessage } from "../components/Layout/LoadingStates";
import { useState } from "react";

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { note, loading, error, refresh } = useAnalysis(noteId || "");
  const [showReview, setShowReview] = useState(false);

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

  return (
    <div className="note-detail">
      <button onClick={() => navigate("/")} className="btn btn-outline btn-sm back-btn">
        &larr; Back to Notes
      </button>

      {/* Original Note */}
      <section className="note-text-section">
        <h2>Clinical Note</h2>
        <div className="note-meta">
          {note.pseudonym && <span>Patient: {note.pseudonym}</span>}
          {note.visit_date && <span>Visit: {note.visit_date}</span>}
          <span>Submitted: {new Date(note.created_at).toLocaleDateString()}</span>
        </div>
        <pre className="note-text">{note.raw_text}</pre>
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
            />
          )}
        </>
      )}
    </div>
  );
}
