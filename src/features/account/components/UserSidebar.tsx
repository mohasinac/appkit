"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Aside, Button, Div, Li, Nav, Span, Ul } from "../../../ui";

export interface UserNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface UserSidebarProps {
  items: UserNavItem[];
  /** Whether the mobile drawer is open */
  mobileOpen?: boolean;
  /** Called when the mobile drawer should close */
  onCloseMobile?: () => void;
  className?: string;
}

function SidebarContent({
  items,
  activeHref,
  onItemClick,
}: {
  items: UserNavItem[];
  activeHref: string;
  onItemClick?: () => void;
}) {
  return (
    <Nav aria-label="User navigation" className="flex-1 overflow-y-auto py-3">
      <Ul className="space-y-0.5 px-2">
        {items.map((item) => {
          const isActive = activeHref === item.href || activeHref.startsWith(item.href + "/");
          return (
            <Li key={item.href}>
              <Link
                href={item.href}
                onClick={onItemClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.icon && (
                  <Span className="shrink-0 text-[1.1rem]">{item.icon}</Span>
                )}
                <Span className="flex-1 truncate">{item.label}</Span>
              </Link>
            </Li>
          );
        })}
      </Ul>
    </Nav>
  );
}

export function UserSidebar({
  items,
  mobileOpen = false,
  onCloseMobile,
  className = "",
}: UserSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <Aside
        className={`hidden md:flex w-56 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-zinc-200 dark:border-slate-700 ${className}`}
      >
        <SidebarContent items={items} activeHref={pathname} />
      </Aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <Div
            role="presentation"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onCloseMobile}
          />
          {/* Drawer panel */}
          <Aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-slate-900 shadow-xl md:hidden">
            <Div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-slate-700">
              <Span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                My Account
              </Span>
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
            <SidebarContent items={items} activeHref={pathname} onItemClick={onCloseMobile} />
          </Aside>
        </>
      )}
    </>
  );
}
