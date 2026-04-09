"use client";

import { useEffect, useRef, RefObject } from "react";

/**
 * Configuration options for useClickOutside hook
 */
export interface UseClickOutsideOptions {
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Event type to listen for (default: 'mousedown') */
  eventType?: "mousedown" | "mouseup" | "click";
  /** Refs to additional elements that should be considered "inside" */
  additionalRefs?: RefObject<HTMLElement | null>[];
}

const EMPTY_REFS: RefObject<HTMLElement | null>[] = [];

/**
 * useClickOutside Hook
 *
 * Detects clicks outside of specified element(s) and triggers a callback.
 * Commonly used for dropdowns, modals, and popovers.
 *
 * @param ref - Primary element reference
 * @param callback - Function to call when clicking outside
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const triggerRef = useRef<HTMLButtonElement>(null);
 *
 * useClickOutside(dropdownRef, () => {
 *   setIsOpen(false);
 * }, {
 *   additionalRefs: [triggerRef],
 *   enabled: isOpen,
 * });
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  callback: (event: MouseEvent | TouchEvent) => void,
  options: UseClickOutsideOptions = {},
) {
  const {
    enabled = true,
    eventType = "mousedown",
    additionalRefs = EMPTY_REFS,
  } = options;

  // Store callback in a ref to avoid re-subscribing listeners on every render
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Check if click is outside the primary ref
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Check if click is outside all additional refs
        const isOutsideAll = additionalRefs.every(
          (additionalRef) =>
            !additionalRef.current ||
            !additionalRef.current.contains(event.target as Node),
        );

        if (isOutsideAll) {
          callbackRef.current(event);
        }
      }
    };

    // Add event listeners for both mouse and touch
    document.addEventListener(eventType, handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener(eventType, handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, enabled, eventType, additionalRefs]);
}
