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

const UI_AVATAR_DISPLAY = {
  base: "appkit-avatar-display",
  sizes: {
    sm: "appkit-avatar-display--sm",
    md: "appkit-avatar-display--md",
    lg: "appkit-avatar-display--lg",
    xl: "appkit-avatar-display--xl",
    "2xl": "appkit-avatar-display--2xl",
  },
  initials: "appkit-avatar-display--initials",
  initialsText: "appkit-avatar-display__initials",
  image: "appkit-avatar-display--image",
  imageInner: "appkit-avatar-display__image",
} as const;

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
        className={[
          UI_AVATAR_DISPLAY.base,
          UI_AVATAR_DISPLAY.sizes[size],
          UI_AVATAR_DISPLAY.initials,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
       data-section="avatardisplay-div-454">
        <Span className={UI_AVATAR_DISPLAY.initialsText}>{initials}</Span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={[
        UI_AVATAR_DISPLAY.base,
        UI_AVATAR_DISPLAY.sizes[size],
        UI_AVATAR_DISPLAY.image,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
     data-section="avatardisplay-div-455">
      <div
        className={UI_AVATAR_DISPLAY.imageInner}
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
