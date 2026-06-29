import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInlineToggle, useInlineTextEdit } from "../useInlineRowEdit";

vi.mock("../../errors/normalize", () => ({ normalizeError: vi.fn() }));

describe("useInlineToggle", () => {
  it("starts with initialValue", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInlineToggle({ rowId: "row-1", field: "active", initialValue: false, save }),
    );
    expect(result.current.value).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it("toggle flips value optimistically", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInlineToggle({ rowId: "row-1", field: "active", initialValue: false, save }),
    );
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.value).toBe(true);
    expect(save).toHaveBeenCalledWith("row-1", "active", true);
  });

  it("reverts to previous value on save failure", async () => {
    const save = vi.fn().mockRejectedValue(new Error("fail"));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useInlineToggle({ rowId: "row-1", field: "active", initialValue: true, save, onError }),
    );
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.value).toBe(true);
    expect(onError).toHaveBeenCalled();
  });

  it("isSaving is false after toggle completes", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInlineToggle({ rowId: "row-1", field: "active", initialValue: false, save }),
    );
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.isSaving).toBe(false);
  });
});

describe("useInlineTextEdit", () => {
  it("starts with initialValue", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save }),
    );
    expect(result.current.value).toBe("Hello");
    expect(result.current.draft).toBe("Hello");
    expect(result.current.isEditing).toBe(false);
  });

  it("startEdit sets isEditing = true", () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save }),
    );
    act(() => result.current.startEdit());
    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe("Hello");
  });

  it("setDraft updates draft without committing", () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save }),
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("World"));
    expect(result.current.draft).toBe("World");
    expect(result.current.value).toBe("Hello");
  });

  it("cancelEdit restores draft and closes editing", () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save }),
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("Changed"));
    act(() => result.current.cancelEdit());
    expect(result.current.draft).toBe("Hello");
    expect(result.current.isEditing).toBe(false);
  });

  it("commitEdit saves when draft differs from value", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save }),
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("World"));
    await act(async () => {
      await result.current.commitEdit();
    });
    expect(save).toHaveBeenCalledWith("row-1", "title", "World");
    expect(result.current.value).toBe("World");
    expect(result.current.isEditing).toBe(false);
  });

  it("commitEdit is a no-op when draft equals value", async () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save }),
    );
    act(() => result.current.startEdit());
    await act(async () => {
      await result.current.commitEdit();
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it("reverts value on save failure", async () => {
    const save = vi.fn().mockRejectedValue(new Error("fail"));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useInlineTextEdit({ rowId: "row-1", field: "title", initialValue: "Hello", save, onError }),
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("World"));
    await act(async () => {
      await result.current.commitEdit();
    });
    expect(result.current.value).toBe("Hello");
    expect(result.current.draft).toBe("Hello");
    expect(onError).toHaveBeenCalled();
  });
});
