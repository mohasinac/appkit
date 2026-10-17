"use client";

/**
 * The toast CONTEXT, split out of `Toast.tsx`.
 *
 * ## Why this module exists
 *
 * `Button` reads `useToastSafe()` so a `<Button action={…}>` with a
 * confirmation can report the outcome, and `Toast` renders a `<Button>` as its
 * dismiss control. Both edges are real VALUE imports, so `Button.tsx` and
 * `Toast.tsx` formed a genuine two-module import cycle — not a type-only one
 * that the compiler erases. `audit-import-cycles` carried it as component 3.
 *
 * A cycle between two primitives is worse than untidy: module initialisation
 * order becomes whichever one the bundler happens to reach first, so a future
 * top-level `const` in either file could read the other's export before it is
 * initialised. Splitting the context out gives both a single direction to
 * depend in — `Button → toast-context` and `Toast → toast-context + Button`.
 *
 * 🛑 `"use client"` must stay the FIRST line: this file creates a React
 * context and exports hooks, and without the directive Next treats it as a
 * Server Component and the recovery render crashes (Root Cause #12).
 *
 * 🛑 ONE `createContext` call, in this file only. The provider and both hooks
 * must resolve to the same object or `useContext` reads an empty context —
 * which is the dual-instance failure mode of Root Cause #19, reachable here by
 * copy-paste rather than by a duplicated package.
 */

import React from "react";

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastContextValue {
  /**
   * Show a toast. Returns the `dismissId` so long-running ops can later finalize
   * via `updateToast(id, "success" | "error", finalMessage)`. For the "loading"
   * variant pass `duration: 0` to keep it pinned until finalized.
   */
  showToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
    action?: { label: string; onClick: () => void },
  ) => string;
  hideToast: (id: string) => void;
  /** Replace an existing toast's variant + message (used to finalize loading toasts). */
  updateToast: (
    id: string,
    variant: ToastVariant,
    message?: string,
    duration?: number,
  ) => void;
}

export const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined,
);

export function buildToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

/**
 * Like `useToast` but returns `undefined` when no `ToastProvider` is mounted
 * instead of throwing. Use in primitives (e.g. `Button`) that must be safe to
 * render outside a toast context — library code that adjusts for its
 * surroundings must not require a provider (Root Cause #20).
 */
export function useToastSafe(): ToastContextValue | undefined {
  return React.useContext(ToastContext);
}
