/**
 * Scrim — primitive for dark fade overlays.
 *
 * Use over images / hero banners / cards to ensure foreground text remains
 * legible regardless of the underlying media's tonality. Replaces raw
 * `bg-gradient-to-X from-black/Y to-transparent` utilities.
 *
 * Direction determines the gradient orientation; intensity selects the
 * starting black opacity. The class is rendered as `position: absolute`
 * with `inset: 0` and `pointer-events: none` by default — its parent
 * needs `position: relative` so the scrim covers the right area.
 */
export type ScrimDirection = "bottom-up" | "top-down" | "left-to-right" | "right-to-left" | "diagonal";
export type ScrimIntensity = "subtle" | "medium" | "strong";

export interface ScrimProps {
  /** Gradient orientation. Defaults to `"bottom-up"` (darken bottom edge). */
  direction?: ScrimDirection;
  /** Strength of the darkest end-stop. Defaults to `"medium"`. */
  intensity?: ScrimIntensity;
  /** When true, the scrim multiplies against the underlying image. */
  multiply?: boolean;
  /** Extra positioning className (e.g. `inset-x-0 bottom-0 h-12`). */
  className?: string;
}

const DIRECTION_CLS: Record<ScrimDirection, string> = {
  "bottom-up": "bg-gradient-to-t",
  "top-down": "bg-gradient-to-b",
  "left-to-right": "bg-gradient-to-r",
  "right-to-left": "bg-gradient-to-l",
  diagonal: "bg-gradient-to-br",
};

const INTENSITY_CLS: Record<ScrimIntensity, string> = {
  subtle: "from-black/40 to-transparent",
  medium: "from-black/60 via-black/30 to-transparent",
  strong: "from-black/80 via-black/30 to-transparent",
};

export function Scrim({
  direction = "bottom-up",
  intensity = "medium",
  multiply = false,
  className = "",
}: ScrimProps) {
  // direction + intensity come from typed enums; the gradient classes are the
  // primitive's internal CSS, not consumer-authored utilities.
  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none",
        DIRECTION_CLS[direction],
        INTENSITY_CLS[intensity],
        multiply ? "mix-blend-multiply" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
