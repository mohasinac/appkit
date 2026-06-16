import React from "react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";

type DivColor = "default" | "primary" | "muted" | "faint" | "success" | "warning" | "error" | "info" | "inverse";

const DIV_COLOR_MAP: Record<DivColor, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
  success: "appkit-color--success",
  warning: "appkit-color--warning",
  error: "appkit-color--error",
  info: "appkit-color--info",
  inverse: "appkit-color--inverse",
};

type DivTextSize = "xs" | "sm" | "base" | "lg";

const DIV_TEXT_SIZE_MAP: Record<DivTextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

type DivTextWeight = "normal" | "medium" | "semibold" | "bold";

const DIV_TEXT_WEIGHT_MAP: Record<DivTextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

type DivLayout = "block" | "flex" | "inline-flex" | "grid" | "inline-block" | "inline";

const DIV_LAYOUT_MAP: Record<DivLayout, string> = {
  block: "block",
  flex: "flex",
  "inline-flex": "inline-flex",
  grid: "grid",
  "inline-block": "inline-block",
  inline: "inline",
};

type DivGap = "none" | "1" | "2" | "3" | "4" | "5" | "6" | "8";

const DIV_GAP_MAP: Record<DivGap, string> = {
  none: "",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8",
};

export interface DivProps extends React.HTMLAttributes<HTMLDivElement>, SurfaceProps {
  /** Colour variant cascaded onto Div text. Pragmatic — most Div sites wrap mixed inline content where a `<Text>` wrap would force structural change. */
  color?: DivColor;
  /** Cascade font-size to children. Use sparingly — prefer wrapping in `<Text size=…>`. */
  textSize?: DivTextSize;
  /** Cascade font-weight to children. Use sparingly — prefer wrapping in `<Text weight=…>`. */
  textWeight?: DivTextWeight;
  /** Display layout. Prefer `<Row>`/`<Stack>`/`<Grid>` when intent matches; this is the escape hatch for one-off bare Div containers. */
  layout?: DivLayout;
  /** Gap between children (CSS gap). Only takes effect when `layout` is `flex`/`inline-flex`/`grid`. */
  gap?: DivGap;
  children?: React.ReactNode;
}

export const Div = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", surface, padding, rounded, border, shadow, color, textSize, textWeight, layout, gap, children, ...props }, ref) => (
    <div
      ref={ref}
      className={[
        buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
        color ? DIV_COLOR_MAP[color] : "",
        textSize ? DIV_TEXT_SIZE_MAP[textSize] : "",
        textWeight ? DIV_TEXT_WEIGHT_MAP[textWeight] : "",
        layout ? DIV_LAYOUT_MAP[layout] : "",
        gap ? DIV_GAP_MAP[gap] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  ),
);
Div.displayName = "Div";
