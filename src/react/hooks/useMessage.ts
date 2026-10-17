"use client"
/**
 * useMessage
 *
 * Manages temporary success/error messages.
 * Delegates to the global ToastProvider so calls to showSuccess/showError
 * always produce a visible overlay toast — even if the component does not
 * render the returned `message` value.
 * The `message` local state is kept for components that still render it
 * inline (e.g. reviews, settings views).
 */

import { useState, useCallback, useRef, useEffect } from "react";
// Defining modules, not the sibling barrel — Root Cause #18. `ui/index.ts` and
// `react/index.ts` re-exported into each other, which is the whole of
// `audit-import-cycles` component 1: an 18-module knot held together entirely
// by barrel hops, none of which needed the barrel.
import { useToast } from "../../ui/components/toast-context";

type MessageType = "success" | "error";

export function useMessage() {
  const { showToast } = useToast();
  const [message, setMessage] = useState<{
    type: MessageType;
    text: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showSuccess = useCallback(
    (text: string) => {
      showToast(text, "success");
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage({ type: "success", text });
      timerRef.current = setTimeout(() => setMessage(null), 5000);
    },
    [showToast],
  );

  const showError = useCallback(
    (text: string) => {
      showToast(text, "error");
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage({ type: "error", text });
      timerRef.current = setTimeout(() => setMessage(null), 5000);
    },
    [showToast],
  );

  const clearMessage = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(null);
  }, []);

  return { message, showSuccess, showError, clearMessage };
}
