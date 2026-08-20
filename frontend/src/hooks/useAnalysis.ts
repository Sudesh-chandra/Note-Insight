import { useState, useEffect } from "react";
import { fetchNoteDetail } from "../api/client";
import type { NoteDetail } from "../types";

export function useAnalysis(noteId: string) {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNote = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNoteDetail(noteId);
      setNote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load note");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId]);

  return { note, loading, error, refresh: loadNote };
}
