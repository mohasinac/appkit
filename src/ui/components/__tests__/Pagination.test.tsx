import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "../Pagination";

function numberedPageLabels(): string[] {
  return screen
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label") ?? "")
    .filter((label) => /^Page \d+$/.test(label))
    .map((label) => label.replace("Page ", ""));
}

describe("Pagination — maxVisible window size (bug regression)", () => {
  it("shows exactly a 6-page middle window (plus the 1/20 anchors) for an even maxVisible", () => {
    render(
      <Pagination
        currentPage={10}
        totalPages={20}
        maxVisible={6}
        onPageChange={vi.fn()}
        showFirstLast={false}
        showPrevNext={false}
      />,
    );
    // Before the fix the middle window was 7 pages (7-13) instead of the
    // requested 6 (8-13) — "7" must NOT appear, and the total count
    // (6-page window + the 1/20 anchors) must be 8, not 9.
    const labels = numberedPageLabels();
    expect(labels).toEqual(["1", "8", "9", "10", "11", "12", "13", "20"]);
  });

  it("still shows the documented odd default (7) window unchanged", () => {
    render(
      <Pagination
        currentPage={10}
        totalPages={20}
        maxVisible={7}
        onPageChange={vi.fn()}
        showFirstLast={false}
        showPrevNext={false}
      />,
    );
    const labels = numberedPageLabels();
    expect(labels).toEqual(["1", "7", "8", "9", "10", "11", "12", "13", "20"]);
  });
});
