"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "../../ui";

export interface BackToTopProps {
  /** Scroll distance (px) before the button appears. Defaults to 400. */
  threshold?: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * BackToTop — floating scroll-to-top button.
 * Appears after the page has scrolled past `threshold` pixels.
 */
export function BackToTop({
  threshold = 400,
  ariaLabel = "Back to top",
  className = "",
}: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-20 right-4 z-40 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 shadow-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      <ChevronUp className="w-5 h-5" aria-hidden="true" />
    </Button>
  );
}

/** SkipToMain — visually hidden link that becomes visible on focus for keyboard users. */
export function SkipToMain({ mainId = "main-content" }: { mainId?: string }) {
  return (
    <Link
      href={`#${mainId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:text-zinc-900 dark:focus:text-zinc-100 focus:shadow-lg focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm font-medium"
    >
      Skip to main content
    </Link>
  );
}
