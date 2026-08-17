"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { Button, Div } from "../../ui";
import { normalizeError } from "../../errors/normalize";

export interface BackToTopProps {
  /** Scroll distance (px) before the button appears. Defaults to 400. */
  threshold?: number;
  ariaLabel?: string;
  className?: string;
}

const DISMISSED_KEY = "appkit:back-to-top-dismissed";

/**
 * BackToTop — floating scroll-to-top button.
 * Appears after the page has scrolled past `threshold` pixels. A small
 * dismiss control lets the user hide it for the rest of the browser
 * session (sessionStorage) — on narrow viewports it can sit close enough
 * to the bottom nav / other floating controls to feel like clutter, so it
 * needs the same "get out of my way" escape hatch as StickyToolbar.
 * Re-appears on the next page load.
 */
export function BackToTop({
  threshold = 400,
  ariaLabel = "Back to top",
  className = "",
}: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISSED_KEY) === "1");
    } catch (_err) {
      void normalizeError(_err);
      // sessionStorage unavailable — never dismissed for this render.
    }
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  if (!visible || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch (_err) {
      void normalizeError(_err);
      // sessionStorage unavailable — dismissal still applies for this render.
    }
  };

  return (
    <Div layout="flex" align="center" gap="1" className={`fixed bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem))] right-4 z-[var(--appkit-z-bottom-nav)] ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={ariaLabel}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)] shadow-md text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface)] dark:hover:bg-slate-700 transition-colors"
      >
        <ChevronUp className="w-5 h-5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Hide back-to-top button"
        onClick={handleDismiss}
        className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)] shadow-md text-[var(--appkit-color-text-faint)] hover:text-[var(--appkit-color-text)] transition-colors"
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </Button>
    </Div>
  );
}

/** SkipToMain — visually hidden link that becomes visible on focus for keyboard users. */
export function SkipToMain({ mainId = "main-content" }: { mainId?: string }) {
  return (
    <Link
      href={`#${mainId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[var(--appkit-z-toast)] focus:px-[var(--appkit-space-4)] focus:py-[var(--appkit-space-2)] focus:rounded-lg focus:bg-[var(--appkit-color-surface)] dark:focus:bg-slate-900 focus:text-zinc-900 dark:focus:text-zinc-100 focus:shadow-lg focus:ring-2 focus:ring-primary-500 focus:outline-none text-[length:var(--appkit-text-sm)] font-medium"
    >
      Skip to main content
    </Link>
  );
}
