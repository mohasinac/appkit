"use client";
import React from "react";
import { Aside, Button, Div, Nav, Span } from "../../../ui";

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

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <>
          <Div
            role="presentation"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onCloseMobile}
          />
          <Aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-slate-900 shadow-xl md:hidden">
            <Div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-slate-700">
              <Span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Admin Panel</Span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Close menu"
                onClick={onCloseMobile}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </Div>
            <Nav aria-label="Admin sidebar" className="flex-1 overflow-y-auto py-3">
              {renderHeader?.()}
              {renderNavItems?.(activePath)}
              {renderFooter?.()}
            </Nav>
          </Aside>
        </>
      )}
    </>
  );
}
