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
    // Explicitly clear every property this component owns before
    // (re-)applying — otherwise a value set on a previous render (e.g. a
    // `background` gradient) stays in the inline style forever once that
    // prop becomes undefined, even though a sibling prop like `color` is
    // now supposed to take over.
    el.style.background = background ?? "";
    el.style.backgroundColor = !background && color ? color : "";
    el.style.color = textColor ?? "";
  }, [background, color, textColor]);
  return (
    <div ref={ref} className={className} aria-hidden={ariaHidden}>
      {children}
    </div>
  );
}
