"use client";
/**
 * useScrollToTop — jump to the top whenever a key changes.
 *
 * ## Why a HOOK and not a `<ScrollToTop />` component
 *
 * The consumer had a 17-line component doing exactly this. Lifting it as a
 * component would not work: the only interesting line is
 * `usePathname()` from `@/i18n/navigation`, and that is the consumer's own
 * routing choice (next-intl, locale-prefixed). appkit cannot import it, and
 * taking a `pathname` prop would mean a component whose entire job is to pass
 * one value to one effect.
 *
 * So the mechanism moves and the binding stays: the consumer keeps a four-line
 * mount that supplies its own `usePathname()`.
 *
 * ## 🛑 `behavior: "auto"`, deliberately
 *
 * Not `"smooth"`. A route change should look instantaneous; smooth-scrolling a
 * fresh page animates content the reader has not seen yet, and on a long page
 * the animation is still running when they start reading. It also ignores
 * `prefers-reduced-motion`, which `"auto"` sidesteps entirely by not animating.
 *
 * ## 🛑 Does NOT fire on mount
 *
 * `useEffect` with a dependency runs on mount too, which would fight the
 * browser's own scroll restoration on a back-navigation — the reader returns to
 * a list, the browser restores their place, and this yanks them to the top.
 * The first run is skipped so only genuine changes scroll.
 *
 * That is a behaviour FIX, not a port: the consumer's component scrolled on
 * mount. It was unnoticeable there because Next remounts the tree on a hard
 * load anyway, but it is wrong for a hook anyone may mount mid-tree.
 *
 * @example
 * ```tsx
 * "use client";
 * import { usePathname } from "@/i18n/navigation";
 * import { useScrollToTop } from "@mohasinac/appkit/react/hooks/useScrollToTop";
 *
 * export function ScrollToTop() {
 *   useScrollToTop(usePathname());
 *   return null;
 * }
 * ```
 *
 * @tag domain:routing
 * @tag layer:client
 * @tag access:client
 * @tag sideEffects:dom
 */
import { useEffect, useRef } from "react";

export interface UseScrollToTopOptions {
  /** Skip scrolling without unmounting the caller. Default `true`. */
  enabled?: boolean;
}

export function useScrollToTop(
  key: string | null | undefined,
  { enabled = true }: UseScrollToTopOptions = {},
): void {
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    // First run: record and do nothing — see the note on scroll restoration.
    if (previous.current === undefined) {
      previous.current = key;
      return;
    }
    if (previous.current === key) return;
    previous.current = key;
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [key, enabled]);
}
