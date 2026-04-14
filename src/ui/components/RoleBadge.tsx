"use client";

import React from "react";
import { Badge } from "./Badge";

export interface RoleBadgeProps {
  role: string;
  label?: string;
  className?: string;
  roleColorMap?: Record<string, string>;
}

const DEFAULT_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderator",
  seller: "Seller",
  user: "User",
};

const DEFAULT_ROLE_COLORS: Record<string, string> = {
  admin: "admin",
  moderator: "moderator",
  seller: "seller",
  user: "user",
};

export function RoleBadge({
  role,
  label,
  className,
  roleColorMap,
}: RoleBadgeProps) {
  const variant = (roleColorMap?.[role] ??
    DEFAULT_ROLE_COLORS[role] ??
    "default") as "admin" | "moderator" | "seller" | "user" | "default";

  return (
    <Badge variant={variant} className={className}>
      {label ?? DEFAULT_ROLE_LABELS[role] ?? role}
    </Badge>
  );
}
