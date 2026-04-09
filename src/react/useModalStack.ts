"use client";

import { useCallback, useRef, useState } from "react";

// ─── ModalEntry ───────────────────────────────────────────────────────────────

export interface ModalEntry<T = unknown> {
  id: string;
  data?: T;
}

// ─── useModalStack ────────────────────────────────────────────────────────────

/**
 * useModalStack — manages a LIFO stack of modal/drawer instances.
 *
 * Supports nested modal flows (e.g. confirmation on top of form).
 * The topmost entry in the stack is the "active" modal.
 *
 * @example
 * ```tsx
 * const { open, close, closeAll, isOpen, peek } = useModalStack<ReviewData>();
 *
 * // open a modal with optional payload:
 * <Button onClick={() => open("review-modal", review)}>Write Review</Button>
 *
 * const active = peek();          // { id: "review-modal", data: review }
 * const visible = isOpen("review-modal");
 * ```
 */
export function useModalStack<T = unknown>() {
  const [stack, setStack] = useState<ModalEntry<T>[]>([]);
  const idCounter = useRef(0);

  const open = useCallback((id: string, data?: T) => {
    setStack((prev) => [...prev, { id, data }]);
  }, []);

  const close = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const closeAll = useCallback(() => {
    setStack([]);
  }, []);

  const closeById = useCallback((id: string) => {
    setStack((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const peek = useCallback((): ModalEntry<T> | undefined => {
    return stack[stack.length - 1];
  }, [stack]);

  const isOpen = useCallback(
    (id: string): boolean => {
      return stack.some((e) => e.id === id);
    },
    [stack],
  );

  const isTopmost = useCallback(
    (id: string): boolean => {
      return stack[stack.length - 1]?.id === id;
    },
    [stack],
  );

  const nextId = useCallback(() => {
    idCounter.current++;
    return `modal-${idCounter.current}`;
  }, []);

  return {
    stack,
    open,
    close,
    closeAll,
    closeById,
    peek,
    isOpen,
    isTopmost,
    nextId,
    depth: stack.length,
  };
}
