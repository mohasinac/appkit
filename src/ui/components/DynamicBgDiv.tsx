"use client";
import { useRef, useEffect, type ReactNode } from "react";

export interface DynamicBgDivProps {
  /** Solid color (hex, rgb, CSS var) — sets `backgroundColor`. */
  color?: string;
  /** Full background shorthand (gradient, image, etc.) — sets `background`. */
  background?: string;
  /** Sets `color` (text color). */
  textColor?: string;
  className?: string;
  children?: ReactNode;
  "aria-hidden"?: boolean | "true" | "false";
}

export function DynamicBgDiv({
  color,
  background,
  textColor,
  className = "",
  children,
  "aria-hidden": ariaHidden,
}: DynamicBgDivProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (background) el.style.background = background;
    else if (color) el.style.backgroundColor = color;
    if (textColor) el.style.color = textColor;
  }, [background, color, textColor]);
  return (
    <div ref={ref} className={className} aria-hidden={ariaHidden}>
      {children}
    </div>
  );
}
