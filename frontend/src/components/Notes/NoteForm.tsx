import { useState } from "react";

interface NoteFormProps {
  onSubmit: (rawText: string, pseudonym?: string, visitDate?: string) => void;
  loading: boolean;
}

export function NoteForm({ onSubmit, loading }: NoteFormProps) {
  const [rawText, setRawText] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const charCount = rawText.length;
  const isValid = charCount >= 10 && charCount <= 30000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(rawText, pseudonym || undefined, visitDate || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="note-form">
      <div className="form-group">
        <div className="textarea-header">
          <label htmlFor="note-text">Clinical Note</label>
          <span className={`char-count ${charCount > 30000 ? "over-limit" : ""}`}>
            {charCount.toLocaleString()} / 30,000 characters
          </span>
        </div>
        <textarea
          id="note-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the clinical note here..."
          rows={12}
          disabled={loading}
          required
        />
        {charCount > 0 && charCount < 10 && (
          <span className="field-hint">Minimum 10 characters required</span>
        )}
      </div>

      <button
        type="button"
        className="link-btn optional-toggle"
        onClick={() => setShowOptional(!showOptional)}
      >
        {showOptional ? "Hide" : "Add"} optional metadata
      </button>

      {showOptional && (
        <div className="optional-fields">
          <div className="form-group">
            <label htmlFor="pseudonym">Patient Pseudonym / ID</label>
            <input
              id="pseudonym"
              type="text"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder="e.g., MC-2024-1115"
              disabled={loading}
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label htmlFor="visit-date">Visit Date</label>
            <input
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={!isValid || loading}
      >
        {loading ? "Analyzing note..." : "Analyze Note"}
      </button>
    </form>
  );
}
