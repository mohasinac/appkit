"use client";
import "client-only";

import { useState, useEffect } from "react";

/**
 * useMediaQuery Hook
 *
 * Detects if a CSS media query matches the current viewport.
 * Returns true/false based on whether the query matches.
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean - Whether the media query currently matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    // Lazy initializer: use real value on first client render, suppressing the flash.
    // Returns false on server (no window) — consistent with no-match default.
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
