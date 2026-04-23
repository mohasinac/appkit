import React from "react";

/**
 * Skeleton — content placeholder with pulse or wave animation.
 *
 * Extracted from src/components/ui/Skeleton.tsx for @mohasinac/ui.
 * Wave animation uses a plain <style> element (no styled-jsx dependency).
 */

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  animation = "pulse",
}: SkeletonProps) {
  const variantClass =
    variant === "circular"
      ? "appkit-skeleton--circular"
      : "appkit-skeleton--rounded";

  const defaultSize = {
    circular: { width: "40px", height: "40px" },
    rectangular: { width: "100%", height: "140px" },
    text: { width: "100%", height: "1em" },
  }[variant];

  const animationClass = {
    pulse: "appkit-skeleton--pulse",
    wave: "appkit-skeleton--wave",
    none: "",
  }[animation];

  const style: React.CSSProperties = {
    width: width ?? defaultSize.width,
    height: height ?? defaultSize.height,
  };

  return (
    <div
      className={`appkit-skeleton ${variantClass} ${animationClass} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
     data-section="skeleton-div-606">
      <span className="appkit-sr-only">Loading...</span>
    </div>
  );
}
