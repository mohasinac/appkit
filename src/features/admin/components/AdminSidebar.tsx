"use client";
import React from "react";
import { Aside, Nav } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";

export interface AdminSidebarProps {
  renderNavItems?: (activePath: string) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  activePath?: string;
  /** Whether the mobile drawer is open */
  mobileOpen?: boolean;
  /** Called when the mobile drawer should close */
  onCloseMobile?: () => void;
  className?: string;
}

export function AdminSidebar({
  renderNavItems,
  renderHeader,
  renderFooter,
  activePath = "",
  mobileOpen = false,
  onCloseMobile,
  className = "",
}: AdminSidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <Aside
        className={`hidden md:flex w-64 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-zinc-200 dark:border-slate-700 ${className}`}
      >
        <Nav aria-label="Admin sidebar" className="flex-1 overflow-y-auto py-3">
          {renderHeader?.()}
          {renderNavItems?.(activePath)}
          {renderFooter?.()}
        </Nav>
      </Aside>

      {/* Mobile: BottomSheet slides up from bottom */}
      <BottomSheet
        open={mobileOpen}
        onClose={onCloseMobile ?? (() => {})}
        title="Admin Panel"
      >
        <Nav aria-label="Admin sidebar" className="py-3">
          {renderHeader?.()}
          {renderNavItems?.(activePath)}
          {renderFooter?.()}
        </Nav>
      </BottomSheet>
    </>
  );
}
