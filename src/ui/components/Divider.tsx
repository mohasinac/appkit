import { Span } from "./Typography";

/**
 * Divider — horizontal or vertical visual separator with optional label.
 *
 * Extracted from src/components/ui/Divider.tsx for @mohasinac/ui.
 * Theme values inlined from THEME_CONSTANTS.themed.
 */

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
        className={`appkit-divider appkit-divider--vertical ${className}`}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div
        className={`appkit-divider appkit-divider--labeled ${className}`}
        role="separator"
      >
        <div className="appkit-divider__line" />
        <Span className="appkit-divider__label">{label}</Span>
        <div className="appkit-divider__line" />
      </div>
    );
  }

  return (
    <div
      className={`appkit-divider appkit-divider--horizontal ${className}`}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}
