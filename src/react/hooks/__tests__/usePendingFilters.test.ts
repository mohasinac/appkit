import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePendingFilters } from "../usePendingFilters";

function makeTable(urlState: Record<string, string> = {}) {
  const state: Record<string, string> = { ...urlState };
  return {
    get: vi.fn((key: string) => state[key] ?? ""),
    set: vi.fn((key: string, value: string) => { state[key] = value; }),
    setMany: vi.fn((updates: Record<string, string>) => {
      Object.assign(state, updates);
    }),
    getState: () => state,
  };
}

describe("usePendingFilters — initial state from URL", () => {
  it("starts with values parsed from current URL params", () => {
    const table = makeTable({ status: "SHIPPED,DELIVERED", category: "" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status", "category"] }),
    );
    expect(result.current.pending["status"]).toEqual(["SHIPPED", "DELIVERED"]);
    expect(result.current.pending["category"]).toEqual([]);
  });

  it("applied mirrors initial URL state", () => {
    const table = makeTable({ status: "PENDING" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    expect(result.current.applied["status"]).toEqual(["PENDING"]);
  });

  it("appliedCount sums all applied values", () => {
    const table = makeTable({ status: "A,B", role: "admin" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status", "role"] }),
    );
    expect(result.current.appliedCount).toBe(3);
  });
});

describe("usePendingFilters — set (local state)", () => {
  it("set updates pending without calling table.setMany", () => {
    const table = makeTable({});
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    act(() => result.current.set("status", ["SHIPPED", "CANCELLED"]));
    expect(result.current.pending["status"]).toEqual(["SHIPPED", "CANCELLED"]);
    expect(table.setMany).not.toHaveBeenCalled();
  });

  it("isDirty is true when pending differs from applied", () => {
    const table = makeTable({ status: "" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    act(() => result.current.set("status", ["SHIPPED"]));
    expect(result.current.isDirty).toBe(true);
  });

  it("pendingCount reflects total pending values", () => {
    const table = makeTable({});
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status", "role"] }),
    );
    act(() => result.current.set("status", ["A", "B"]));
    act(() => result.current.set("role", ["admin"]));
    expect(result.current.pendingCount).toBe(3);
  });
});

describe("usePendingFilters — apply", () => {
  it("apply writes pending to URL via table.setMany with page reset", () => {
    const table = makeTable({});
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status", "role"] }),
    );
    act(() => result.current.set("status", ["SHIPPED"]));
    act(() => result.current.set("role", ["seller"]));
    act(() => result.current.apply());
    expect(table.setMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SHIPPED", role: "seller", page: "1" }),
    );
  });
});

describe("usePendingFilters — reset", () => {
  it("reset reverts pending to current URL values", () => {
    const table = makeTable({ status: "PENDING" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    act(() => result.current.set("status", ["SHIPPED"]));
    expect(result.current.pending["status"]).toEqual(["SHIPPED"]);
    act(() => result.current.reset());
    expect(result.current.pending["status"]).toEqual(["PENDING"]);
  });
});

describe("usePendingFilters — clear", () => {
  it("clear empties pending and writes empty strings to URL", () => {
    const table = makeTable({ status: "SHIPPED" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    act(() => result.current.clear());
    expect(result.current.pending["status"]).toEqual([]);
    expect(table.setMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: "", page: "1" }),
    );
  });
});

describe("usePendingFilters — clearAll", () => {
  it("clearAll empties all filter keys plus any extra keys", () => {
    const table = makeTable({ status: "SHIPPED", search: "pokemon" });
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    act(() => result.current.clearAll({ search: "" }));
    expect(table.setMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: "", search: "", page: "1" }),
    );
  });

  it("isDirty is false after apply", () => {
    const table = makeTable({});
    const { result } = renderHook(() =>
      usePendingFilters({ table: table as any, keys: ["status"] }),
    );
    expect(result.current.isDirty).toBe(false);
  });
});
