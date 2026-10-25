"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { Div } from "../../ui/components/Div";
import { IconButton } from "../../ui/components/IconButton";
import { useHandMode } from "../../_internal/client/hand-mode";

export interface BackToTopProps {
  /** Scroll distance (px) before the button appears. Defaults to 400. */
  threshold?: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * BackToTop — floating scroll-to-top button.
 *
 * Sits at the top of the three-tier bottom edge: the nav bar is the floor
 * (`--bottom-nav-height`), everything non-nav is one measured tier in between
 * (`--bottom-chrome-height`, published by `<BottomChrome>`), and this floats a
 * gutter above the sum. The offset is deliberately expressed against the tier
 * rather than against any individual bar, so a CTA row changing height, a bar
 * revealing on desktop scroll, or a new bottom bar added later all just work —
 * this `calc()` never has to grow again.
 *
 * Appears after the page has scrolled past `threshold` pixels. A small
 * dismiss control hides it for the current page view only — dismissal is
 * plain in-memory component state, reset on every route change (via
 * `usePathname()`) so navigating anywhere brings it back. Deliberately NOT
 * persisted to storage: an earlier version wrote the dismissal to
 * `sessionStorage`, and because this component is mounted once inside the
 * persistent `AppLayoutShell` (it never remounts on client-side navigation),
 * that meant one click hid the button for the rest of the browser tab
 * session with no way to bring it back — reported as "the button is gone
 * forever." See CLAUDE.md Recurrent Root Cause Patterns.
 */
export function BackToTop({
  threshold = 400,
  ariaLabel = "Back to top",
  className = "",
}: BackToTopProps) {
  const pathname = usePathname();
  const { hand } = useHandMode();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  // Reset dismissal on every route change — the component itself never
  // unmounts (it lives inside the persistent app shell), so without this
  // a single dismiss would otherwise hide the button for the whole session.
  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  if (!visible || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <Div layout="flex" align="center" gap="1" className={`fixed bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem)+var(--bottom-chrome-height,0px)+var(--appkit-space-4))] transition-[bottom] duration-300 ease-out ${hand === "left" ? "left-4" : "right-4"} z-[var(--appkit-z-back-to-top)] ${className}`}>
      {/*
        * 🛑 <IconButton>, NOT <Button size="sm"> with width/height utilities —
        * Root Cause #80.
        *
        * The dismiss control was `<Button size="sm" className="w-6 h-6">`, and
        * it rendered as an EMPTY outlined pill with no ✕ in it: the reported
        * "the close button is not showing up". `.appkit-button--sm` sets
        * `padding: 0.375rem 0.75rem`, i.e. 12px of horizontal padding on each
        * side, so a 24px-wide (`w-6`) button has exactly ZERO content width —
        * and `.appkit-button__content` carries `min-width: 0` (the Root Cause
        * #68 fix), so the 12px glyph obligingly shrank to nothing rather than
        * overflowing where someone would have seen it. The same rule's
        * `min-height: 36px` also beat `h-6` under `important: true`, so the box
        * was a 24×36 ellipse rather than the intended 24px circle.
        *
        * `IconButton` boxes set width AND height with no padding and no min,
        * so they are true squares at every size, and they derive the glyph size
        * from the box (`ICON_BUTTON_ICON_SIZE`) instead of leaving the two to
        * be chosen independently and disagree.
        */}
      <IconButton
        type="button"
        variant="outline"
        size="touch"
        rounded="full"
        aria-label={ariaLabel}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        icon={<ChevronUp aria-hidden="true" />}
      />
      <IconButton
        type="button"
        variant="outline"
        size="sm"
        rounded="full"
        aria-label="Hide back-to-top button"
        onClick={handleDismiss}
        icon={<X aria-hidden="true" />}
      />
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
