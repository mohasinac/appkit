import React from "react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";

type DivColor = "default" | "primary" | "muted" | "faint" | "success" | "warning" | "error" | "info";

const DIV_COLOR_MAP: Record<DivColor, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
  success: "appkit-color--success",
  warning: "appkit-color--warning",
  error: "appkit-color--error",
  info: "appkit-color--info",
};

export interface DivProps extends React.HTMLAttributes<HTMLDivElement>, SurfaceProps {
  /** Colour variant cascaded onto Div text. Pragmatic — most Div sites wrap mixed inline content where a `<Text>` wrap would force structural change. */
  color?: DivColor;
  children?: React.ReactNode;
}

export const Div = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", surface, padding, rounded, border, shadow, color, children, ...props }, ref) => (
    <div
      ref={ref}
      className={[
        buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
        color ? DIV_COLOR_MAP[color] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  ),
);
Div.displayName = "Div";
