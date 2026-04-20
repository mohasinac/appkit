"use client"
import React, { useState, useEffect, useRef, useCallback } from "react";

const POSITION: Record<string, string> = {
  top: "appkit-tooltip__bubble--top",
  bottom: "appkit-tooltip__bubble--bottom",
  left: "appkit-tooltip__bubble--left",
  right: "appkit-tooltip__bubble--right",
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

  // -- Long-press handlers for touch devices ----------------------------------

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
      "aria-label":
        (existingProps["aria-label"] as string | undefined) ?? label,
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
        if (typeof existingProps.onFocus === "function")
          existingProps.onFocus(e);
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
    <span className="appkit-tooltip">
      {child}

      {/* Desktop tooltip bubble */}
      {visible && (
        <span
          role="tooltip"
          className={`appkit-tooltip__bubble ${POSITION[side]}`}
        >
          {label}
        </span>
      )}

      {/* Mobile long-press bottom sheet */}
      {mobileOpen && (
        <span
          role="presentation"
          className="appkit-tooltip__mobile-sheet"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <span
            className="appkit-tooltip__mobile-backdrop"
            aria-hidden="true"
          />
          {/* Panel */}
          <span
            role="tooltip"
            aria-label={label}
            className="appkit-tooltip__mobile-panel"
          >
            {/* Drag handle */}
            <span className="appkit-tooltip__mobile-drag" aria-hidden="true" />
            <span className="appkit-tooltip__mobile-text">{label}</span>
          </span>
        </span>
      )}
    </span>
  );
}
