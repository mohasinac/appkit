import React from "react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";

export interface DivProps extends React.HTMLAttributes<HTMLDivElement>, SurfaceProps {
  children?: React.ReactNode;
}

export const Div = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", surface, padding, rounded, border, shadow, children, ...props }, ref) => (
    <div ref={ref} className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  ),
);
Div.displayName = "Div";
