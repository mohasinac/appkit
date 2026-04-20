import React from "react";
import { Nav } from "../../../ui";

export interface AdminSidebarProps {
  renderNavItems?: (activePath: string) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  activePath?: string;
  className?: string;
}

export function AdminSidebar({
  renderNavItems,
  renderHeader,
  renderFooter,
  activePath = "",
  className = "",
}: AdminSidebarProps) {
  return (
    <Nav aria-label="Admin sidebar" className={className}>
      {renderHeader?.()}
      {renderNavItems?.(activePath)}
      {renderFooter?.()}
    </Nav>
  );
}
