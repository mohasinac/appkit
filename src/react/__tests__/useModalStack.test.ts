import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModalStack } from "../useModalStack";

describe("useModalStack — initial state", () => {
  it("stack is empty on mount", () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.stack).toHaveLength(0);
    expect(result.current.depth).toBe(0);
  });

  it("isOpen(anyId) returns false when stack is empty", () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.isOpen("any-id")).toBe(false);
  });

  it("peek() returns undefined when stack is empty", () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.peek()).toBeUndefined();
  });

  it("isTopmost(anyId) returns false when stack is empty", () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.isTopmost("any-id")).toBe(false);
  });
});

describe("useModalStack — open", () => {
  it("open(id) adds entry to stack", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("modal-1"));
    expect(result.current.stack).toHaveLength(1);
    expect(result.current.depth).toBe(1);
  });

  it("isOpen(id) returns true after open(id)", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("modal-a"));
    expect(result.current.isOpen("modal-a")).toBe(true);
  });

  it("isOpen(other-id) returns false for unrelated id", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("modal-a"));
    expect(result.current.isOpen("modal-b")).toBe(false);
  });

  it("open(id, data) stores data in the entry", () => {
    const { result } = renderHook(() => useModalStack<{ name: string }>());
    act(() => result.current.open("edit-modal", { name: "Pikachu" }));
    expect(result.current.peek()?.data).toEqual({ name: "Pikachu" });
  });

  it("open(id2) after open(id1) pushes id2 on top (LIFO)", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("modal-1");
      result.current.open("modal-2");
    });
    expect(result.current.stack).toHaveLength(2);
    expect(result.current.peek()?.id).toBe("modal-2");
  });

  it("peek() returns the topmost entry", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("first");
      result.current.open("second");
    });
    expect(result.current.peek()?.id).toBe("second");
  });
});

describe("useModalStack — close", () => {
  it("close() removes the topmost entry", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("modal-1");
      result.current.open("modal-2");
    });
    act(() => result.current.close());
    expect(result.current.stack).toHaveLength(1);
    expect(result.current.peek()?.id).toBe("modal-1");
  });

  it("close() with one entry leaves stack empty", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("modal-1"));
    act(() => result.current.close());
    expect(result.current.stack).toHaveLength(0);
  });

  it("close() on empty stack does not throw", () => {
    const { result } = renderHook(() => useModalStack());
    expect(() => act(() => result.current.close())).not.toThrow();
    expect(result.current.stack).toHaveLength(0);
  });
});

describe("useModalStack — closeById", () => {
  it("closeById(id) removes the entry with matching id regardless of position", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("bottom");
      result.current.open("middle");
      result.current.open("top");
    });
    act(() => result.current.closeById("middle"));
    expect(result.current.stack).toHaveLength(2);
    expect(result.current.isOpen("middle")).toBe(false);
    expect(result.current.isOpen("bottom")).toBe(true);
    expect(result.current.isOpen("top")).toBe(true);
  });

  it("closeById with id not in stack does not throw and leaves stack unchanged", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("modal-1"));
    expect(() => act(() => result.current.closeById("nonexistent"))).not.toThrow();
    expect(result.current.stack).toHaveLength(1);
  });
});

describe("useModalStack — closeAll", () => {
  it("closeAll() empties the stack", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("m1");
      result.current.open("m2");
      result.current.open("m3");
    });
    act(() => result.current.closeAll());
    expect(result.current.stack).toHaveLength(0);
  });

  it("isOpen(anyId) returns false after closeAll", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("m1");
      result.current.open("m2");
    });
    act(() => result.current.closeAll());
    expect(result.current.isOpen("m1")).toBe(false);
    expect(result.current.isOpen("m2")).toBe(false);
  });

  it("closeAll() on empty stack does not throw", () => {
    const { result } = renderHook(() => useModalStack());
    expect(() => act(() => result.current.closeAll())).not.toThrow();
  });
});

describe("useModalStack — isTopmost", () => {
  it("topmost entry → isTopmost(id) = true", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("first");
      result.current.open("second");
    });
    expect(result.current.isTopmost("second")).toBe(true);
  });

  it("non-top entry → isTopmost(id) = false", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => {
      result.current.open("first");
      result.current.open("second");
    });
    expect(result.current.isTopmost("first")).toBe(false);
  });

  it("id not in stack → isTopmost(id) = false", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("first"));
    expect(result.current.isTopmost("nonexistent")).toBe(false);
  });

  it("single entry is both open and topmost", () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open("only-modal"));
    expect(result.current.isOpen("only-modal")).toBe(true);
    expect(result.current.isTopmost("only-modal")).toBe(true);
  });
});

describe("useModalStack — nextId", () => {
  it("nextId() returns a string with 'modal-' prefix", () => {
    const { result } = renderHook(() => useModalStack());
    const id1 = result.current.nextId();
    expect(id1).toMatch(/^modal-\d+$/);
  });

  it("nextId() increments the counter on each call", () => {
    const { result } = renderHook(() => useModalStack());
    const id1 = result.current.nextId();
    const id2 = result.current.nextId();
    const n1 = parseInt(id1.replace("modal-", ""), 10);
    const n2 = parseInt(id2.replace("modal-", ""), 10);
    expect(n2).toBe(n1 + 1);
  });
});

describe("useModalStack — depth alias", () => {
  it("depth equals stack.length", () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.depth).toBe(0);
    act(() => result.current.open("m1"));
    expect(result.current.depth).toBe(1);
    act(() => result.current.open("m2"));
    expect(result.current.depth).toBe(2);
    act(() => result.current.close());
    expect(result.current.depth).toBe(1);
  });
});
