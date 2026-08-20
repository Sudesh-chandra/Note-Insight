import { useState, useEffect } from "react";
import { fetchNotes } from "../api/client";
import type { NoteListItem } from "../types";

export function useNotes() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotes();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  return { notes, loading, error, refresh: loadNotes };
}
