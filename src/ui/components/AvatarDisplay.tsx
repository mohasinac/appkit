"use client";

import React from "react";
import { Span } from "./Typography";
import type { ImageCropData } from "../../features/media";

export interface AvatarDisplayProps {
  cropData: ImageCropData | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  alt?: string;
  displayName?: string | null;
  email?: string | null;
}

const SIZE_CLASS: Record<NonNullable<AvatarDisplayProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
  "2xl": "h-32 w-32",
};

export function AvatarDisplay({
  cropData,
  size = "md",
  className = "",
  alt = "Profile avatar",
  displayName,
  email,
}: AvatarDisplayProps) {
  const initials = (() => {
    if (displayName?.trim()) {
      const parts = displayName.trim().split(" ").filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  })();

  if (!cropData?.url) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${SIZE_CLASS[size]} ${className} flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600`}
      >
        <Span className="select-none font-semibold text-white">{initials}</Span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`${SIZE_CLASS[size]} ${className} relative overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-800`}
    >
      <div
        className="absolute h-full w-full -translate-x-1/2 -translate-y-1/2 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${cropData.url})`,
          backgroundSize: "cover",
          width: `${(cropData.zoom || 1) * 100}%`,
          height: `${(cropData.zoom || 1) * 100}%`,
          left: `${cropData.position?.x || 50}%`,
          top: `${cropData.position?.y || 50}%`,
        }}
      />
    </div>
  );
}
