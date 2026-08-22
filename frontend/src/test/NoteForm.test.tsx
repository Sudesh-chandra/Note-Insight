import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteForm } from "../components/Notes/NoteForm";

describe("NoteForm", () => {
  it("renders textarea and submit button", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    expect(screen.getByLabelText(/clinical note/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze note/i })).toBeInTheDocument();
  });

  it("shows character count", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    expect(screen.getByText("0 / 30,000 characters")).toBeInTheDocument();
  });

  it("disables submit button when text is too short", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    const textarea = screen.getByLabelText(/clinical note/i);
    fireEvent.change(textarea, { target: { value: "short" } });

    const button = screen.getByRole("button", { name: /analyze note/i });
    expect(button).toBeDisabled();
  });

  it("enables submit button when text is valid (>= 10 chars)", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    const textarea = screen.getByLabelText(/clinical note/i);
    fireEvent.change(textarea, { target: { value: "A".repeat(10) } });

    const button = screen.getByRole("button", { name: /analyze note/i });
    expect(button).not.toBeDisabled();
  });

  it("shows 'Analyzing note...' text when loading", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={true} />);

    expect(screen.getByRole("button", { name: /analyzing note/i })).toBeInTheDocument();
  });

  it("disables textarea when loading", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={true} />);

    const textarea = screen.getByLabelText(/clinical note/i);
    expect(textarea).toBeDisabled();
  });

  it("shows minimum character hint when text is between 1-9 chars", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    const textarea = screen.getByLabelText(/clinical note/i);
    fireEvent.change(textarea, { target: { value: "hello" } });

    expect(screen.getByText(/minimum 10 characters/i)).toBeInTheDocument();
  });

  it("calls onSubmit with text when form is submitted", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    const textarea = screen.getByLabelText(/clinical note/i);
    fireEvent.change(textarea, { target: { value: "Patient presents with hypertension." } });

    const button = screen.getByRole("button", { name: /analyze note/i });
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith(
      "Patient presents with hypertension.",
      undefined,
      undefined
    );
  });

  it("toggles optional metadata fields", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    // Optional fields should be hidden initially
    expect(screen.queryByLabelText(/pseudonym/i)).not.toBeInTheDocument();

    // Click toggle
    fireEvent.click(screen.getByText(/add optional metadata/i));

    // Now they should be visible
    expect(screen.getByLabelText(/pseudonym/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/visit date/i)).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(screen.getByText(/hide optional metadata/i));
    expect(screen.queryByLabelText(/pseudonym/i)).not.toBeInTheDocument();
  });

  it("shows over-limit styling when exceeding 30,000 chars", () => {
    const onSubmit = vi.fn();
    render(<NoteForm onSubmit={onSubmit} loading={false} />);

    const textarea = screen.getByLabelText(/clinical note/i);
    fireEvent.change(textarea, { target: { value: "A".repeat(30001) } });

    const charCount = screen.getByText(/30,001/);
    expect(charCount.classList.contains("over-limit") || charCount.closest(".over-limit")).toBeTruthy();
  });
});
