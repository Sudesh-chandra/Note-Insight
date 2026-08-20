import { auth } from "../firebase";
import type { NoteDetail, NoteListItem, NoteCreateResponse, Condition, DocumentationGap } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Wrapper around fetch that attaches the Firebase ID token as a Bearer token.
 * Every API call goes through here — no raw fetch calls elsewhere.
 */
async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated — please sign in again.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("Authentication failed. Please sign out and sign in again.");
  }

  return response;
}

export async function submitNote(
  rawText: string,
  pseudonym?: string,
  visitDate?: string
): Promise<NoteCreateResponse> {
  const response = await authenticatedFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({
      raw_text: rawText,
      pseudonym: pseudonym || null,
      visit_date: visitDate || null,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to submit note" }));
    throw new Error(error.detail || "Failed to submit note");
  }
  return response.json();
}

export async function fetchNotes(): Promise<NoteListItem[]> {
  const response = await authenticatedFetch("/api/notes");
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Failed to fetch notes" }));
    throw new Error(err.detail || "Failed to fetch notes");
  }
  return response.json();
}

export async function fetchNoteDetail(noteId: string): Promise<NoteDetail> {
  const response = await authenticatedFetch(`/api/notes/${noteId}`);
  if (!response.ok) throw new Error("Note not found");
  return response.json();
}

export async function submitReview(
  noteId: string,
  analysisId: string,
  review: { conditions: Condition[]; gaps: DocumentationGap[]; summary: string }
): Promise<void> {
  const response = await authenticatedFetch(
    `/api/analyses/${noteId}/${analysisId}/review`,
    {
      method: "PUT",
      body: JSON.stringify(review),
    }
  );
  if (!response.ok) throw new Error("Failed to save review");
}
