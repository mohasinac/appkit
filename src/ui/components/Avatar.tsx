"use client";

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

const SIZE_MAP: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

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
  const sizeClass = SIZE_MAP[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name ?? ""}
        className={[
          "rounded-full object-cover bg-zinc-100 dark:bg-slate-800",
          sizeClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={[
        "inline-flex items-center justify-center rounded-full",
        "bg-zinc-200 font-medium text-zinc-700 dark:bg-slate-700 dark:text-slate-200",
        sizeClass,
        className,
      ]
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
    <div className={["flex -space-x-2", className].filter(Boolean).join(" ")}>
      {visible.map((avatar, index) => (
        <Avatar
          key={`${avatar.src ?? avatar.name ?? "avatar"}-${index}`}
          {...avatar}
          size={size}
          className="ring-2 ring-white dark:ring-slate-900"
        />
      ))}
      {extra > 0 ? (
        <span
          className={[
            "inline-flex items-center justify-center rounded-full ring-2 ring-white",
            "bg-zinc-300 text-xs font-medium text-zinc-700 dark:bg-slate-600 dark:text-slate-200 dark:ring-slate-900",
            SIZE_MAP[size],
          ].join(" ")}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export default Avatar;
