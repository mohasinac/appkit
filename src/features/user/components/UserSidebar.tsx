"use client";

import React from "react";
import { Nav } from "../../../ui";

export interface UserSidebarProps {
  renderNavItems?: (activePath: string) => React.ReactNode;
  renderAvatar?: () => React.ReactNode;
  activePath?: string;
  className?: string;
  ariaLabel?: string;
}

export function UserSidebar({
  renderNavItems,
  renderAvatar,
  activePath = "",
  className = "",
  ariaLabel = "User account navigation",
}: UserSidebarProps) {
  return (
    <Nav aria-label={ariaLabel} className={className}>
      {renderAvatar?.()}
      {renderNavItems?.(activePath)}
    </Nav>
  );
}
