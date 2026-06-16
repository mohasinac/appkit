/**
 * NavbarChevron — scroll-direction button used by NavbarLayout when its
 * horizontal item list overflows. Encapsulates the white→transparent edge
 * fade so the chevron icon stays legible over scrolling content underneath.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface NavbarChevronProps {
  direction: "left" | "right";
  onClick: () => void;
}

// audit-variant-ok: NavbarChevron is the catalogued primitive for the
// navbar's overflow-scroll fade — the gradient classes implement the
// edge-fade affordance, not consumer styling.
const BASE_CLS =
  "absolute top-0 bottom-0 z-10 flex items-center justify-center w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors";
const FADE_LEFT =
  "bg-gradient-to-r from-white/95 dark:from-slate-950/95 to-transparent";
const FADE_RIGHT =
  "bg-gradient-to-l from-white/95 dark:from-slate-950/95 to-transparent";

export function NavbarChevron({ direction, onClick }: NavbarChevronProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Scroll navigation ${direction}`}
      className={[
        BASE_CLS,
        direction === "left" ? `left-0 ${FADE_LEFT}` : `right-0 ${FADE_RIGHT}`,
      ].join(" ")}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
