import React from "react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";

/**
 * Who absorbs the leftover width.
 *
 * The BASIS is content-proportional in all three — only the grow factor
 * differs. `fill` is for bars and sheets, `end`/`start` for desktop dialog and
 * editor footers where stretching two buttons across a 32rem dialog would read
 * as a banner rather than a pair of controls.
 */
export type ActionRowAlign = "fill" | "end" | "start";

type ActionRowGap = "xs" | "sm" | "md" | "lg";

const ACTION_ROW_GAP_MAP: Record<ActionRowGap, string> = {
  xs: "appkit-gap--xs",
  sm: "appkit-gap--sm",
  md: "appkit-gap--md",
  lg: "appkit-gap--lg",
};

const ACTION_ROW_ALIGN_MAP: Record<ActionRowAlign, string> = {
  fill: "",
  end: "appkit-action-row--end",
  start: "appkit-action-row--start",
};

export interface ActionRowProps extends React.HTMLAttributes<HTMLDivElement>, SurfaceProps {
  /** Who absorbs the leftover width. Default `"fill"`. */
  align?: ActionRowAlign;
  /**
   * Left-hand meta slot that is NOT an action: a title, a breadcrumb, an
   * "Add more details →" link, or a lone Discard button.
   *
   * Content-sized and shrinkable to nothing, so it may ellipsise where an
   * action never may. This replaces every `justify-content: space-between`
   * footer and the `<span />` spacer hack that came with them — with a flat
   * row, `space-between` across three children opens the gulf BETWEEN the two
   * buttons instead of between the meta and the pair.
   */
  anchor?: React.ReactNode;
  /** Gap between actions. Default `"sm"` (0.5rem). */
  gap?: ActionRowGap;
  children?: React.ReactNode;
}

/**
 * The one layout law for CTA / footer action rows.
 *
 * Each action is sized from its own label and only the LEFTOVER is shared out;
 * labels wrap rather than truncate; a row that cannot fit wraps to the next
 * line rather than crushing its children. All of that lives in
 * `ActionRow.style.css` as parent-selector rules, deliberately NOT as Tailwind
 * classes on the children — see the stylesheet for why.
 *
 * 🛑 Callers must not put `flex-1`, `flex-shrink-0`, `basis-*`, `w-*`, `h-*`,
 * `truncate` or `leading-none` on a child. Both configs set `important: true`,
 * so any of those beats every rule in the stylesheet and silently reverts that
 * one row to the old squeezed behaviour with no visible error.
 *
 * Not for the bulk-action bar. That is a fixed three-control composite
 * (count pill | picker | Apply) where the picker is MEANT to eat all the slack
 * and the pill must stay pill-sized.
 */
export const ActionRow = React.forwardRef<HTMLDivElement, ActionRowProps>(
  (
    {
      className = "",
      align = "fill",
      anchor,
      gap = "sm",
      surface,
      padding,
      paddingX,
      paddingY,
      rounded,
      roundedTop,
      roundedBottom,
      border,
      shadow,
      overflow,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={[
        "appkit-action-row",
        ACTION_ROW_ALIGN_MAP[align],
        ACTION_ROW_GAP_MAP[gap],
        buildSurfaceClasses({
          surface,
          padding,
          paddingX,
          paddingY,
          rounded,
          roundedTop,
          roundedBottom,
          border,
          shadow,
          overflow,
        }),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {anchor !== undefined && anchor !== null && (
        <div className="appkit-action-row__anchor">{anchor}</div>
      )}
      <div className="appkit-action-row__group">{children}</div>
    </div>
  ),
);
ActionRow.displayName = "ActionRow";
