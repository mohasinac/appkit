"use client"
import { useRef, useCallback, useEffect } from "react";

/**
 * Fires `callback` after the element is held for `ms` milliseconds.
 * Quick taps (pointer-up before threshold) do NOT fire the callback.
 * Triggers haptic feedback via `navigator.vibrate` on mobile.
 * Safe for both mouse and touch devices.
 */
export function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      navigator.vibrate?.(30);
      callbackRef.current();
    }, ms);
  }, [ms]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => { if (timerRef.current !== null) clearTimeout(timerRef.current); }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    // Browsers fire touchcancel (not touchend) when a touch is reinterpreted
    // as a scroll — common for cards in a scrollable list. Without this the
    // pending timer survives and can fire the callback after what was really
    // just a scroll, contradicting the "quick taps do NOT fire" contract.
    onTouchCancel: cancel,
  };
}
