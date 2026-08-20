import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitNote } from "../api/client";
import { NoteForm } from "../components/Notes/NoteForm";
import { NoteHistory } from "../components/Notes/NoteHistory";
import { useNotes } from "../hooks/useNotes";

export function DashboardPage() {
  const navigate = useNavigate();
  const { notes, loading, error, refresh } = useNotes();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (rawText: string, pseudonym?: string, visitDate?: string) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitNote(rawText, pseudonym, visitDate);
      // Navigate to the new note's analysis page
      navigate(`/notes/${result.note_id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to analyze note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard">
      <section className="dashboard-section">
        <h2>New Analysis</h2>
        <p className="section-description">
          Paste a clinical note below to extract conditions, assess documentation quality,
          and suggest diagnosis codes.
        </p>
        {submitError && <div className="form-error">{submitError}</div>}
        <NoteForm onSubmit={handleSubmit} loading={submitting} />
      </section>

      <section className="dashboard-section">
        <h2>Your Notes</h2>
        <NoteHistory notes={notes} loading={loading} error={error} onRefresh={refresh} />
      </section>
    </div>
  );
}
