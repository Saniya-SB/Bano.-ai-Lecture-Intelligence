import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

describe("EmptyState component", () => {
  it("renders title, description, and action button", () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your search criteria."
        action={<Button>Create Item</Button>}
      />
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your search criteria.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Item" })).toBeInTheDocument();
  });
});

describe("ErrorState component", () => {
  it("renders error message and handles retry callback", () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Failed to fetch data"
        message="A network timeout occurred."
        onRetry={handleRetry}
        retryLabel="Try Again"
      />
    );

    expect(screen.getByText("Failed to fetch data")).toBeInTheDocument();
    expect(screen.getByText("A network timeout occurred.")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
