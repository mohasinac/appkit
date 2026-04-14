/**
 * Spinner — generic loading indicator.
 *
 * Extracted from src/components/ui/Spinner.tsx for @mohasinac/ui.
 * No app-specific imports; pure Tailwind CSS.
 */

export interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "white" | "current";
  className?: string;
  label?: string;
}

export function Spinner({
  size = "md",
  variant = "primary",
  className = "",
  label = "Loading...",
}: SpinnerProps) {
  const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
    sm: "appkit-spinner__indicator--sm",
    md: "appkit-spinner__indicator--md",
    lg: "appkit-spinner__indicator--lg",
    xl: "appkit-spinner__indicator--xl",
  };

  const variantClasses: Record<NonNullable<SpinnerProps["variant"]>, string> = {
    primary: "appkit-spinner__indicator--primary",
    white: "appkit-spinner__indicator--white",
    current: "appkit-spinner__indicator--current",
  };

  return (
    <div
      className={`appkit-spinner ${className}`}
      role="status"
      aria-label={label}
    >
      <div
        className={`appkit-spinner__indicator ${sizeClasses[size]} ${variantClasses[variant]}`}
      />
      {label && <span className="appkit-sr-only">{label}</span>}
    </div>
  );
}
