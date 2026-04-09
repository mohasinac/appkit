"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * useBreakpoint Hook
 *
 * Convenience hook for detecting common Tailwind breakpoints.
 * Returns boolean flags and the current breakpoint name.
 *
 * Breakpoints (Tailwind defaults):
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 *
 * @returns Object with breakpoint detection flags
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop, breakpoint } = useBreakpoint();
 *
 * if (isMobile) {
 *   return <MobileView />;
 * }
 * return <DesktopView />;
 * ```
 */
export function useBreakpoint() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const breakpoint = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint: breakpoint as "mobile" | "tablet" | "desktop",
  };
}
