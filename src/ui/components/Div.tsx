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

export interface DivProps extends React.HTMLAttributes<HTMLDivElement>, SurfaceProps {
  /** Colour variant cascaded onto Div text. Pragmatic — most Div sites wrap mixed inline content where a `<Text>` wrap would force structural change. */
  color?: DivColor;
  /** Cascade font-size to children. Use sparingly — prefer wrapping in `<Text size=…>`. */
  textSize?: DivTextSize;
  /** Cascade font-weight to children. Use sparingly — prefer wrapping in `<Text weight=…>`. */
  textWeight?: DivTextWeight;
  children?: React.ReactNode;
}

export const Div = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", surface, padding, rounded, border, shadow, color, textSize, textWeight, children, ...props }, ref) => (
    <div
      ref={ref}
      className={[
        buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
        color ? DIV_COLOR_MAP[color] : "",
        textSize ? DIV_TEXT_SIZE_MAP[textSize] : "",
        textWeight ? DIV_TEXT_WEIGHT_MAP[textWeight] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  ),
);
Div.displayName = "Div";
