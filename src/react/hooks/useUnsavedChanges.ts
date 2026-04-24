"use client"
import { useState, useEffect, useCallback, useRef } from "react";
import { ERROR_MESSAGES } from "../../errors/messages";

export const UNSAVED_CHANGES_EVENT = "unsaved-changes:confirm";

export interface UseUnsavedChangesOptions {
  /** Current form values to compare against initial */
  formValues: Record<string, string>;
  /** Initial form values snapshot (taken when data loads) */
  initialValues: Record<string, string> | null;
  /** Additional dirty flag from outside the form (e.g. pending avatar upload) */
  extraDirty?: boolean;
  /**
   * Called when the user attempts to navigate away with unsaved changes.
   * Must return a Promise that resolves to `true` (continue) or `false` (stay).
   * Defaults to `window.confirm` with a generic message.
   */
  confirmFn?: () => Promise<boolean>;
  /**
   * Message shown in the browser-native `beforeunload` dialog.
   * Most modern browsers ignore custom messages and show their own text.
   */
  beforeUnloadWarning?: string;
}

export interface UseUnsavedChangesReturn {
  /** Whether there are any unsaved changes (form or extra) */
  isDirty: boolean;
  /** Whether the form fields specifically have changed */
  isFormDirty: boolean;
  /** Call after a successful save to reset initial values to current */
  markClean: () => void;
  /** Prompt the user and return true if they confirmed leaving, false otherwise */
  confirmLeave: () => Promise<boolean>;
}

/**
 * useUnsavedChanges
 *
 * Tracks unsaved form changes and warns users before navigating away.
 *
 * - Compares `formValues` to `initialValues` to detect form dirtiness
 * - Accepts an optional `extraDirty` flag (e.g. pending file upload)
 * - Registers a `beforeunload` handler while dirty
 * - Exposes `confirmLeave()` which calls the provided `confirmFn` (or falls back
 *   to `window.confirm`) to handle navigation guards
 * - `markClean()` resets the snapshot after a successful save
 */
export function useUnsavedChanges({
  formValues,
  initialValues,
  extraDirty = false,
  confirmFn,
  beforeUnloadWarning = ERROR_MESSAGES.GENERIC.UNSAVED_CHANGES,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [savedSnapshot, setSavedSnapshot] = useState<Record<
    string,
    string
  > | null>(initialValues);
  const savedSnapshotRef = useRef(savedSnapshot);
  savedSnapshotRef.current = savedSnapshot;

  // Sync snapshot when initialValues first arrives (data load)
  useEffect(() => {
    if (initialValues && !savedSnapshotRef.current) {
      setSavedSnapshot(initialValues);
    }
  }, [initialValues]);

  const isFormDirty = (() => {
    if (!savedSnapshot) return false;
    return Object.keys(formValues).some(
      (key) => (formValues[key] ?? "") !== (savedSnapshot[key] ?? ""),
    );
  })();

  const isDirty = isFormDirty || extraDirty;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = beforeUnloadWarning;
      return beforeUnloadWarning;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, beforeUnloadWarning]);

  const markClean = useCallback(() => {
    setSavedSnapshot({ ...formValues });
  }, [formValues]);

  const confirmLeave = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);
    if (confirmFn) return confirmFn();
    return Promise.resolve(
      window.confirm(beforeUnloadWarning),
    );
  }, [isDirty, confirmFn]);

  return { isDirty, isFormDirty, markClean, confirmLeave };
}
