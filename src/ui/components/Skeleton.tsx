"use client";

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

// bgTertiary inlined from THEME_CONSTANTS.themed.bgTertiary
const BG_TERTIARY = "bg-zinc-100 dark:bg-slate-800";

const WAVE_CSS = `
@keyframes appkit-skeleton-wave {
  0% { transform: translateX(-100%); }
  50%, 100% { transform: translateX(100%); }
}
.appkit-skeleton-wave {
  position: relative;
  overflow: hidden;
}
.appkit-skeleton-wave::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  animation: appkit-skeleton-wave 1.5s infinite;
}
`;

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  animation = "pulse",
}: SkeletonProps) {
  const variantClass = variant === "circular" ? "rounded-full" : "rounded";

  const defaultSize = {
    circular: { width: "40px", height: "40px" },
    rectangular: { width: "100%", height: "140px" },
    text: { width: "100%", height: "1em" },
  }[variant];

  const animationClass = {
    pulse: "animate-pulse",
    wave: "appkit-skeleton-wave",
    none: "",
  }[animation];

  const style: React.CSSProperties = {
    width: width ?? defaultSize.width,
    height: height ?? defaultSize.height,
  };

  return (
    <>
      {animation === "wave" && (
        <style dangerouslySetInnerHTML={{ __html: WAVE_CSS }} />
      )}
      <div
        className={`${BG_TERTIARY} ${variantClass} ${animationClass} ${className}`}
        style={style}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </>
  );
}
