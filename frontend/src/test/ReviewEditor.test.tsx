import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewEditor } from "../components/Analysis/ReviewEditor";
import type { Analysis } from "../types";

// Mock the API client
vi.mock("../api/client", () => ({
  submitReview: vi.fn().mockResolvedValue(undefined),
}));

// Mock Firebase
vi.mock("../firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("fake-token"),
    },
  },
}));

const mockAnalysis: Analysis = {
  id: "analysis-1",
  note_id: "note-1",
  ai_conditions: [
    {
      name: "Hypertension",
      evidence_quote: "history of hypertension",
      documentation_status: "well_documented",
      icd10_code: "I10",
      confidence: 0.9,
    },
    {
      name: "Type 2 Diabetes",
      evidence_quote: "Type 2 diabetes mellitus",
      documentation_status: "well_documented",
      icd10_code: "E11",
      confidence: 0.85,
    },
  ],
  ai_gaps: [
    {
      description: "No renal function assessment",
      severity: "medium",
    },
  ],
  ai_summary: "Patient with multiple chronic conditions.",
  model_version: "google/gemini-2.5-flash",
  prompt_version: "v2",
  quote_validation: [
    { condition_name: "Hypertension", evidence_quote: "history of hypertension", found_in_note: true },
    { condition_name: "Type 2 Diabetes", evidence_quote: "Type 2 diabetes mellitus", found_in_note: true },
  ],
  status: "completed",
  created_at: "2024-03-15T10:00:00Z",
  reviewed_conditions: null,
  reviewed_gaps: null,
  reviewed_summary: null,
  review_status: "pending",
  reviewed_at: null,
};

describe("ReviewEditor", () => {
  const defaultProps = {
    noteId: "note-1",
    analysis: mockAnalysis,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all AI conditions", () => {
    render(<ReviewEditor {...defaultProps} />);

    // Should show condition count
    expect(screen.getByText("Conditions (2)")).toBeInTheDocument();

    // Should show condition names in inputs
    const nameInputs = screen.getAllByDisplayValue(/.*ypertension.*/);
    expect(nameInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all AI gaps", () => {
    render(<ReviewEditor {...defaultProps} />);
    expect(screen.getByText("Documentation Gaps (1)")).toBeInTheDocument();
  });

  it("renders the AI summary in textarea", () => {
    render(<ReviewEditor {...defaultProps} />);
    const summaryTextarea = screen.getByLabelText(/encounter summary/i);
    expect(summaryTextarea).toHaveValue("Patient with multiple chronic conditions.");
  });

  it("allows editing condition name", () => {
    render(<ReviewEditor {...defaultProps} />);

    const nameInputs = screen.getAllByDisplayValue(/Hypertension/);
    const firstInput = nameInputs[0]!;
    fireEvent.change(firstInput, { target: { value: "Essential Hypertension" } });

    expect(firstInput).toHaveValue("Essential Hypertension");
  });

  it("allows removing a condition", () => {
    render(<ReviewEditor {...defaultProps} />);

    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]!); // Remove first condition

    expect(screen.getByText("Conditions (1)")).toBeInTheDocument();
  });

  it("allows adding a new condition", () => {
    render(<ReviewEditor {...defaultProps} />);

    fireEvent.click(screen.getByText("+ Add Condition"));

    expect(screen.getByText("Conditions (3)")).toBeInTheDocument();
  });

  it("allows adding a new gap", () => {
    render(<ReviewEditor {...defaultProps} />);

    fireEvent.click(screen.getByText("+ Add Gap"));

    expect(screen.getByText("Documentation Gaps (2)")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    render(<ReviewEditor {...defaultProps} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("shows error when saving with no named conditions", async () => {
    render(<ReviewEditor {...defaultProps} />);

    // Remove all conditions
    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]!);
    const removeButtons2 = screen.getAllByText("Remove");
    fireEvent.click(removeButtons2[0]!);

    // Try to save
    fireEvent.click(screen.getByText("Save Review"));

    // Should show error
    expect(await screen.findByText(/at least one condition/i)).toBeInTheDocument();
  });

  it("shows 'Saving...' text during save", async () => {
    const { submitReview } = await import("../api/client");
    vi.mocked(submitReview).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<ReviewEditor {...defaultProps} />);

    fireEvent.click(screen.getByText("Save Review"));

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});
