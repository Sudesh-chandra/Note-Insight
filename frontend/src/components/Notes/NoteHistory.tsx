import { useNavigate } from "react-router-dom";
import type { NoteListItem } from "../../types";
import { LoadingSpinner, ErrorMessage, EmptyState } from "../Layout/LoadingStates";

interface NoteHistoryProps {
  notes: NoteListItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function NoteHistory({ notes, loading, error, onRefresh }: NoteHistoryProps) {
  if (loading) {
    return <LoadingSpinner message="Loading your notes..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRefresh} />;
  }

  if (notes.length === 0) {
    return (
      <EmptyState message="No notes yet. Submit your first clinical note above." />
    );
  }

  return (
    <div className="note-history">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

function NoteCard({ note }: { note: NoteListItem }) {
  const navigate = useNavigate();
  const date = new Date(note.created_at);

  return (
    <div className="note-card" onClick={() => navigate(`/notes/${note.id}`)}>
      <div className="note-card-header">
        <span className="note-card-date">
          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className={`status-badge ${note.review_status}`}>
          {note.review_status}
        </span>
      </div>
      <div className="note-card-body">
        <span className="note-card-patient">
          {note.pseudonym || "Unnamed patient"}
        </span>
        {note.visit_date && (
          <span className="note-card-visit">Visit: {note.visit_date}</span>
        )}
      </div>
      <div className="note-card-footer">
        <span className="condition-count">
          {note.condition_count} condition{note.condition_count !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
