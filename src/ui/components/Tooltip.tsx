"use client";

import React, { useState, useEffect, useRef } from "react";

const TOOLTIP_CONTENT =
  "absolute z-50 whitespace-nowrap px-2 py-1 text-xs font-medium rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm pointer-events-none";

const POSITION: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export interface TooltipProps {
  /** Text shown in the tooltip bubble */
  label: string;
  /** Single child element — must accept mouse/focus events */
  children: React.ReactElement;
  /** Which side to render the tooltip on (default: "top") */
  side?: "top" | "bottom" | "left" | "right";
  /** Delay before showing tooltip in ms (default: 400) */
  delay?: number;
}

/**
 * Tooltip wrapper. Injects `aria-label` into the child if not already present,
 * and shows a visible label bubble on hover/focus.
 *
 * @example
 * ```tsx
 * <Tooltip label="Add to wishlist">
 *   <IconButton aria-label="Add to wishlist" icon={<HeartIcon />} onClick={handleWishlist} />
 * </Tooltip>
 * ```
 */
export function Tooltip({
  label,
  children,
  side = "top",
  delay = 400,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  // Clone child to inject aria-label + mouse/focus handlers
  const existingProps = children.props as Record<string, unknown>;
  const child = React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    {
    "aria-label": (existingProps["aria-label"] as string | undefined) ?? label,
    onMouseEnter: (e: React.MouseEvent) => {
      if (typeof existingProps.onMouseEnter === "function")
        existingProps.onMouseEnter(e);
      showTooltip();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (typeof existingProps.onMouseLeave === "function")
        existingProps.onMouseLeave(e);
      hideTooltip();
    },
    onFocus: (e: React.FocusEvent) => {
      if (typeof existingProps.onFocus === "function") existingProps.onFocus(e);
      setVisible(true);
    },
    onBlur: (e: React.FocusEvent) => {
      if (typeof existingProps.onBlur === "function") existingProps.onBlur(e);
      hideTooltip();
    },
  });

  return (
    <span className="relative inline-flex">
      {child}
      {visible && (
        <span
          role="tooltip"
          className={`${TOOLTIP_CONTENT} ${POSITION[side]}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
