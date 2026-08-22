import { auth } from "../firebase";
import type { NoteDetail, NoteListItem, NoteCreateResponse, ReviewSubmission, MetricsData } from "../types";

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

  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
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

export async function uploadDocument(
  file: File,
  pseudonym?: string,
  visitDate?: string
): Promise<NoteCreateResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated — please sign in again.");

  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append("file", file);
  if (pseudonym) formData.append("pseudonym", pseudonym);
  if (visitDate) formData.append("visit_date", visitDate);

  const response = await fetch(`${API_BASE}/api/notes/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.status === 401) throw new Error("Session expired. Please log in again.");
  if (response.status === 429) throw new Error("Rate limit exceeded. Please wait.");
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to upload document" }));
    throw new Error(error.detail || "Failed to upload document");
  }
  return response.json();
}

export async function streamAnalysis(
  rawText: string,
  onEvent: (event: string, data: unknown) => void
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated — please sign in again.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}/api/notes/analyze/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw_text: rawText }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to start stream" }));
    throw new Error(error.detail || "Failed to start stream");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "message";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const dataStr = line.slice(6).trim();
        try {
          const data = JSON.parse(dataStr);
          onEvent(currentEvent, data);
        } catch {
          onEvent(currentEvent, dataStr);
        }
      }
    }
  }
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
  review: ReviewSubmission
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

export async function fetchMetrics(): Promise<MetricsData> {
  const response = await authenticatedFetch("/api/metrics");
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Failed to fetch metrics" }));
    throw new Error(err.detail || "Failed to fetch metrics");
  }
  return response.json();
}
