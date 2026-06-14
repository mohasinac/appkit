/**
 * HorizontalRule — primitive for `<hr>`.
 *
 * `tone="accent"` consumes `--appkit-gradient-accent-divider` so the divider
 * follows the active theme automatically.
 */
export type HorizontalRuleTone = "default" | "subtle" | "strong" | "accent";
export type HorizontalRuleSpacing = "tight" | "comfortable" | "loose" | "none";

export interface HorizontalRuleProps {
  /** Visual tone. `"accent"` renders a themed gradient divider. */
  tone?: HorizontalRuleTone;
  /** Margin-block preset. Default `"comfortable"`. */
  spacing?: HorizontalRuleSpacing;
  /** Dashed instead of solid. */
  dashed?: boolean;
  /** Accessible role override; default `"separator"`. */
  role?: "separator" | "presentation" | "none";
  /** Accessible aria-orientation override. */
  "aria-orientation"?: "horizontal" | "vertical";
}

const TONE_CLS: Record<HorizontalRuleTone, string> = {
  default: "border-t border-[var(--appkit-color-border)]",
  subtle: "border-t border-[var(--appkit-color-border-subtle)]",
  strong: "border-t-2 border-[var(--appkit-color-border)]",
  // Renders a gradient strip via background-image (not a border).
  accent:
    "h-px border-0 bg-[image:var(--appkit-gradient-accent-divider)] opacity-60",
};

const SPACING_CLS: Record<HorizontalRuleSpacing, string> = {
  none: "my-0",
  tight: "my-2",
  comfortable: "my-4",
  loose: "my-8",
};

export function HorizontalRule({
  tone = "default",
  spacing = "comfortable",
  dashed = false,
  role = "separator",
  "aria-orientation": ariaOrientation = "horizontal",
}: HorizontalRuleProps) {
  const dashedCls = dashed && tone !== "accent" ? " border-dashed" : "";
  return (
    <hr
      role={role}
      aria-orientation={ariaOrientation}
      // audit-variant-ok: HorizontalRule is the catalogued primitive for <hr>.
      // tone + spacing + dashed come from typed enums.
      className={`${TONE_CLS[tone]}${dashedCls} ${SPACING_CLS[spacing]}`}
    />
  );
}
