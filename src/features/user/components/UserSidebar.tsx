"use client";

import React from "react";
import { Nav } from "@mohasinac/ui";

export interface UserSidebarProps {
  renderNavItems?: (activePath: string) => React.ReactNode;
  renderAvatar?: () => React.ReactNode;
  activePath?: string;
  className?: string;
}

export function UserSidebar({
  renderNavItems,
  renderAvatar,
  activePath = "",
  className = "",
}: UserSidebarProps) {
  return (
    <Nav className={className}>
      {renderAvatar?.()}
      {renderNavItems?.(activePath)}
    </Nav>
  );
}
