import React from "react";
import { Span } from "./Typography";

/**
 * Divider — horizontal or vertical visual separator with optional label.
 *
 * Extracted from src/components/ui/Divider.tsx for @mohasinac/ui.
 * Theme values inlined from THEME_CONSTANTS.themed.
 */

// Inlined from THEME_CONSTANTS.themed
const BORDER_LIGHT = "border-zinc-100 dark:border-slate-700/60";
const TEXT_MUTED = "text-zinc-400 dark:text-zinc-500";

export interface DividerProps {
  label?: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({
  label,
  orientation = "horizontal",
  className = "",
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={`w-px h-full border-l ${BORDER_LIGHT} ${className}`}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`} role="separator">
        <div className={`flex-1 h-px border-t ${BORDER_LIGHT}`} />
        <Span className={`text-sm font-medium ${TEXT_MUTED}`}>{label}</Span>
        <div className={`flex-1 h-px border-t ${BORDER_LIGHT}`} />
      </div>
    );
  }

  return (
    <div
      className={`w-full h-px border-t ${BORDER_LIGHT} ${className}`}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}
