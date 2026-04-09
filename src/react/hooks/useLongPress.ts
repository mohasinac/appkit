"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * useLongPress Hook
 *
 * Fires `callback` after the element is held for `ms` milliseconds.
 * A quick tap (pointer-up before the threshold) does NOT fire the callback.
 * Safe to use on both mouse and touch devices.
 *
 * @param callback - Function to call on long-press
 * @param ms       - Hold duration in ms before callback fires (default: 500)
 *
 * @example
 * ```tsx
 * const longPress = useLongPress(() => openContextMenu(), 500);
 *
 * return (
 *   <tr {...longPress}>…</tr>
 * );
 * ```
 */
export function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep callback ref stable — avoids re-attaching on every render
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, ms);
  }, [ms]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
  };
}
