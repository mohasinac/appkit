import React from "react";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

const UI_AVATAR = {
  base: "appkit-avatar",
  fallback: "appkit-avatar--fallback",
  sizes: {
    xs: "appkit-avatar--xs",
    sm: "appkit-avatar--sm",
    md: "appkit-avatar--md",
    lg: "appkit-avatar--lg",
  },
  group: "appkit-avatar-group",
  overflow: "appkit-avatar-group__overflow",
} as const;

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  src,
  alt,
  fallback,
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  const sizeClass = UI_AVATAR.sizes[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name ?? ""}
        className={[UI_AVATAR.base, sizeClass, className]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={[UI_AVATAR.fallback, sizeClass, className]
        .filter(Boolean)
        .join(" ")}
    >
      {fallback ?? getInitials(name)}
    </span>
  );
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = "sm",
  className = "",
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const extra = avatars.length - visible.length;

  return (
    <div className={[UI_AVATAR.group, className].filter(Boolean).join(" ")}>
      {visible.map((avatar, index) => (
        <Avatar
          key={`${avatar.src ?? avatar.name ?? "avatar"}-${index}`}
          {...avatar}
          size={size}
          className="ring-2 ring-white dark:ring-slate-900"
        />
      ))}
      {extra > 0 ? (
        <span className={[UI_AVATAR.overflow, UI_AVATAR.sizes[size]].join(" ")}>
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export default Avatar;
