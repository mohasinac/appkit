import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PaginatedSelect, type AsyncPage, type PaginatedSelectOption } from "../PaginatedSelect";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function page(items: string[]): AsyncPage<PaginatedSelectOption<string>> {
  return { items: items.map((v) => ({ value: v, label: v })), hasMore: false };
}

describe("PaginatedSelect — async search race condition (bug #4 regression)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not let a slower earlier query response overwrite a faster later one", async () => {
    const pending = new Map<string, Deferred<AsyncPage<PaginatedSelectOption<string>>>>();
    const loadOptions = vi.fn((query: string) => {
      const d = deferred<AsyncPage<PaginatedSelectOption<string>>>();
      pending.set(query, d);
      return d.promise;
    });

    render(<PaginatedSelect value={null} onChange={vi.fn()} loadOptions={loadOptions} ariaLabel="test-select" />);

    // Open the dropdown — fires an immediate load("", 1, true).
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      pending.get("")!.resolve(page(["seed"]));
      await Promise.resolve();
    });

    const search = screen.getByPlaceholderText("Search...");

    // Type "a" — debounced load fires after 300ms.
    fireEvent.change(search, { target: { value: "a" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(loadOptions).toHaveBeenCalledWith("a", 1);

    // Type "ab" well after "a"'s request already fired (matches the real
    // repro: two independent in-flight requests, not a single debounced one).
    fireEvent.change(search, { target: { value: "ab" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(loadOptions).toHaveBeenCalledWith("ab", 1);

    // "ab" (fast) resolves first.
    await act(async () => {
      pending.get("ab")!.resolve(page(["ab-result"]));
      await Promise.resolve();
    });
    expect(screen.getByText("ab-result")).toBeInTheDocument();
    expect(screen.queryByText("a-result")).not.toBeInTheDocument();

    // "a" (slow) resolves after — before the fix this would silently
    // overwrite the dropdown with results for a query the user already
    // changed away from.
    await act(async () => {
      pending.get("a")!.resolve(page(["a-result"]));
      await Promise.resolve();
    });
    expect(screen.getByText("ab-result")).toBeInTheDocument();
    expect(screen.queryByText("a-result")).not.toBeInTheDocument();
  });
});
