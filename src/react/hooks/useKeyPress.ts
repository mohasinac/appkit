"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";

/**
 * Key combination modifiers
 */
export interface KeyModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac
}

/**
 * Configuration options for useKeyPress hook
 */
export interface UseKeyPressOptions extends KeyModifiers {
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Event type to listen for (default: 'keydown') */
  eventType?: "keydown" | "keyup" | "keypress";
  /** Prevent default behavior */
  preventDefault?: boolean;
  /** Target element (default: document) */
  target?: HTMLElement | Document | Window;
}

/**
 * useKeyPress Hook
 *
 * Detects keyboard events with support for key combinations.
 * Useful for keyboard shortcuts and accessibility.
 *
 * @param key - Key or array of keys to listen for (e.g., 'Enter', 'Escape', ['a', 'A'])
 * @param callback - Function to call when key is pressed
 * @param options - Configuration options including modifiers
 *
 * @example
 * ```tsx
 * // Simple key press
 * useKeyPress('Escape', () => closeModal());
 *
 * // Key combination (Ctrl+S)
 * useKeyPress('s', handleSave, {
 *   ctrl: true,
 *   preventDefault: true,
 * });
 *
 * // Multiple keys
 * useKeyPress(['Enter', 'NumpadEnter'], handleSubmit);
 * ```
 */
export function useKeyPress(
  key: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: UseKeyPressOptions = {},
) {
  const {
    enabled = true,
    eventType = "keydown",
    preventDefault = false,
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    target = typeof document !== "undefined" ? document : null,
  } = options;

  // Memoize keys array to avoid re-creation when `key` is a string
  const keys = useMemo(() => (Array.isArray(key) ? key : [key]), [key]);

  // Store callback in a ref to keep event listener stable
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Check if pressed key matches any of the target keys
      const isKeyMatch = keys.some((k) => event.key === k || event.code === k);

      if (!isKeyMatch) return;

      // Check modifiers
      const modifiersMatch =
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt &&
        event.metaKey === meta;

      if (!modifiersMatch) return;

      if (preventDefault) {
        event.preventDefault();
      }

      callbackRef.current(event);
    },
    [keys, ctrl, shift, alt, meta, preventDefault],
  );

  useEffect(() => {
    if (!enabled || !target) return;

    target.addEventListener(eventType, handleKeyPress as EventListener);

    return () => {
      target.removeEventListener(eventType, handleKeyPress as EventListener);
    };
  }, [enabled, eventType, handleKeyPress, target]);
}
