import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBulkSelection } from "../useBulkSelection";

type Item = { id: string; name: string };

function makeItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: `item-${i + 1}`, name: `Item ${i + 1}` }));
}

function renderSelection(items: Item[], maxSelection?: number) {
  return renderHook(() =>
    useBulkSelection({ items, keyExtractor: (item) => item.id, maxSelection }),
  );
}

describe("useBulkSelection — initial state", () => {
  it("starts with empty selection", () => {
    const { result } = renderSelection(makeItems(3));
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it("isSelected returns false for any id when empty", () => {
    const { result } = renderSelection(makeItems(3));
    expect(result.current.isSelected("item-1")).toBe(false);
    expect(result.current.isSelected("item-2")).toBe(false);
  });

  it("selectedIdSet is empty Set", () => {
    const { result } = renderSelection(makeItems(3));
    expect(result.current.selectedIdSet.size).toBe(0);
  });
});

describe("useBulkSelection — toggle", () => {
  it("selecting once adds the id", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelecting).toBe(true);
  });

  it("selecting twice deselects the id", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggle("item-1"));
    expect(result.current.isSelected("item-1")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("can select multiple items", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggle("item-2"));
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.isSelected("item-2")).toBe(true);
    expect(result.current.isSelected("item-3")).toBe(false);
  });

  it("isIndeterminate when partial selection", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.isAllSelected).toBe(false);
  });
});

describe("useBulkSelection — max cap", () => {
  it("does not exceed maxSelection", () => {
    const { result } = renderSelection(makeItems(5), 2);
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggle("item-2"));
    act(() => result.current.toggle("item-3"));
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected("item-3")).toBe(false);
  });

  it("can still deselect when at max", () => {
    const { result } = renderSelection(makeItems(5), 2);
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggle("item-2"));
    act(() => result.current.toggle("item-1"));
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected("item-1")).toBe(false);
  });
});

describe("useBulkSelection — toggleAll", () => {
  it("none selected → selects all", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected).toBe(true);
  });

  it("all selected → deselects all", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggleAll());
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
  });

  it("partial selected → selects all", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected).toBe(true);
  });

  it("respects maxSelection when selecting all", () => {
    const { result } = renderSelection(makeItems(5), 3);
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(3);
  });
});

describe("useBulkSelection — clearSelection", () => {
  it("clears all selected items", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggle("item-2"));
    act(() => result.current.clearSelection());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelecting).toBe(false);
  });
});

describe("useBulkSelection — setSelectedIds", () => {
  it("replaces entire selection programmatically", () => {
    const { result } = renderSelection(makeItems(5));
    act(() => result.current.setSelectedIds(["item-2", "item-4"]));
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected("item-2")).toBe(true);
    expect(result.current.isSelected("item-4")).toBe(true);
    expect(result.current.isSelected("item-1")).toBe(false);
  });

  it("respects maxSelection in setSelectedIds", () => {
    const { result } = renderSelection(makeItems(5), 2);
    act(() => result.current.setSelectedIds(["item-1", "item-2", "item-3"]));
    expect(result.current.selectedCount).toBe(2);
  });
});

describe("useBulkSelection — edge cases", () => {
  it("isAllSelected is false when items list is empty", () => {
    const { result } = renderSelection([]);
    expect(result.current.isAllSelected).toBe(false);
  });

  it("selectedIds is stable array from Set", () => {
    const { result } = renderSelection(makeItems(3));
    act(() => result.current.toggle("item-1"));
    expect(Array.isArray(result.current.selectedIds)).toBe(true);
  });
});
