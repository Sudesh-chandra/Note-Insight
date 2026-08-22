import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitNote } from "../api/client";
import { NoteForm } from "../components/Notes/NoteForm";
import { NoteHistory } from "../components/Notes/NoteHistory";
import { DocumentUpload } from "../components/Notes/DocumentUpload";
import { useNotes } from "../hooks/useNotes";

export function DashboardPage() {
  const navigate = useNavigate();
  const { notes, loading, error, refresh } = useNotes();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "upload">("text");

  const handleSubmit = async (rawText: string, pseudonym?: string, visitDate?: string) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitNote(rawText, pseudonym, visitDate);
      navigate(`/notes/${result.note_id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to analyze note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadError = (errorMsg: string) => {
    setSubmitError(errorMsg);
  };

  return (
    <div className="dashboard">
      <section className="dashboard-section">
        <h2>New Analysis</h2>
        <p className="section-description">
          Paste a clinical note or upload a PDF/image to extract conditions,
          assess documentation quality, and suggest diagnosis codes.
        </p>

        {/* Input mode toggle */}
        <div className="input-mode-toggle">
          <button
            className={`toggle-btn ${inputMode === "text" ? "active" : ""}`}
            onClick={() => { setInputMode("text"); setSubmitError(null); }}
          >
            Paste Text
          </button>
          <button
            className={`toggle-btn ${inputMode === "upload" ? "active" : ""}`}
            onClick={() => { setInputMode("upload"); setSubmitError(null); }}
          >
            Upload Document
          </button>
        </div>

        {submitError && <div className="form-error">{submitError}</div>}

        {inputMode === "text" ? (
          <NoteForm onSubmit={handleSubmit} loading={submitting} />
        ) : (
          <DocumentUpload
            onUploadStart={() => setSubmitting(true)}
            onUploadEnd={() => setSubmitting(false)}
            onError={handleUploadError}
          />
        )}
      </section>

      <section className="dashboard-section">
        <h2>Your Notes</h2>
        <NoteHistory notes={notes} loading={loading} error={error} onRefresh={refresh} />
      </section>
    </div>
  );
}
