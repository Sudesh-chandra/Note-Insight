import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/Layout/LoadingStates";

describe("LoadingSpinner", () => {
  it("renders with message", () => {
    render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("renders without message", () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector(".spinner")).toBeInTheDocument();
    expect(container.querySelector(".loading-message")).not.toBeInTheDocument();
  });
});

describe("ErrorMessage", () => {
  it("renders error message", () => {
    render(<ErrorMessage message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message="Error occurred" onRetry={onRetry} />);

    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorMessage message="Error occurred" />);
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders empty state message", () => {
    render(<EmptyState message="No notes yet" />);
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
  });
});
