"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

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
  /**
   * Enable long-press on touch devices to show a bottom-sheet tooltip panel.
   * Designed for mobile where hover is not available. Default: true.
   */
  mobileSheet?: boolean;
  /**
   * Duration in ms to hold touch before the mobile sheet opens. Default: 500.
   */
  longPressDelay?: number;
}

/**
 * Tooltip wrapper. Injects `aria-label` into the child if not already present,
 * and shows a visible label bubble on hover/focus (desktop) or long-press
 * (mobile — opens an accessible bottom-sheet panel).
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
  mobileSheet = true,
  longPressDelay = 500,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      if (longPressRef.current !== null) clearTimeout(longPressRef.current);
    };
  }, []);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  // ── Long-press handlers for touch devices ──────────────────────────────────

  const handleTouchStart = useCallback(() => {
    if (!mobileSheet) return;
    longPressRef.current = setTimeout(() => {
      setMobileOpen(true);
    }, longPressDelay);
  }, [mobileSheet, longPressDelay]);

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current !== null) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  // Close mobile sheet on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Clone child to inject aria-label + mouse/focus/touch handlers
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
      onTouchStart: (e: React.TouchEvent) => {
        if (typeof existingProps.onTouchStart === "function")
          existingProps.onTouchStart(e);
        handleTouchStart();
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (typeof existingProps.onTouchEnd === "function")
          existingProps.onTouchEnd(e);
        handleTouchEnd();
      },
      onTouchCancel: (e: React.TouchEvent) => {
        if (typeof existingProps.onTouchCancel === "function")
          existingProps.onTouchCancel(e);
        handleTouchEnd();
      },
    },
  );

  return (
    <span className="relative inline-flex">
      {child}

      {/* Desktop tooltip bubble */}
      {visible && (
        <span
          role="tooltip"
          className={`${TOOLTIP_CONTENT} ${POSITION[side]}`}
        >
          {label}
        </span>
      )}

      {/* Mobile long-press bottom sheet */}
      {mobileOpen && (
        <span
          role="presentation"
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <span
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          {/* Panel */}
          <span
            role="tooltip"
            aria-label={label}
            className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-2 rounded-t-2xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Drag handle */}
            <span
              className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mb-2"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 text-center">
              {label}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

