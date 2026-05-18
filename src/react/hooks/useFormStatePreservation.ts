"use client";
import { useEffect, useRef, useCallback } from "react";

export interface FormStatePreservationOptions<TValues> {
  /** Current form values to persist. */
  values: TValues;
  /** Callback invoked with restored values on mount (if any). */
  onRestore: (values: TValues) => void;
  /** Field paths whose values are stripped before encoding (PII). */
  stripFields?: string[];
  /** URL query-param name. Default: "_s". */
  paramName?: string;
  /** Debounce in ms. Default: 500. */
  debounceMs?: number;
  /** Disable persistence (e.g. while submitting). */
  enabled?: boolean;
}

const PARAM_DEFAULT = "_s";

function stripPii<T>(values: T, stripFields: string[]): T {
  if (!stripFields.length || typeof values !== "object" || values === null) {
    return values;
  }
  const clone: Record<string, unknown> = { ...(values as Record<string, unknown>) };
  for (const path of stripFields) {
    if (path in clone) {
      delete clone[path];
    }
  }
  return clone as T;
}

export function useFormStatePreservation<TValues extends Record<string, unknown>>({
  values,
  onRestore,
  stripFields = [],
  paramName = PARAM_DEFAULT,
  debounceMs = 500,
  enabled = true,
}: FormStatePreservationOptions<TValues>) {
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (restoredRef.current || typeof window === "undefined") return;
    restoredRef.current = true;
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get(paramName);
    if (!encoded) return;
    try {
      const decoded = JSON.parse(atob(encoded)) as TValues;
      onRestore(decoded);
    } catch {
      // ignore corrupt payloads
    }
  }, [paramName, onRestore]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !restoredRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const stripped = stripPii(values, stripFields);
      const encoded = btoa(JSON.stringify(stripped));
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, encoded);
      window.history.replaceState({}, "", url.toString());
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [values, enabled, paramName, debounceMs, stripFields]);

  const clearPreservedState = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has(paramName)) {
      url.searchParams.delete(paramName);
      window.history.replaceState({}, "", url.toString());
    }
  }, [paramName]);

  return { clearPreservedState };
}
