"use client"
import React from "react";
import { usePathname } from "next/navigation";
import { NavbarLayout } from "./NavbarLayout";
import type { NavbarLayoutItem } from "./NavbarLayout";

export interface MainNavbarItem {
  /** Unique key used for filtering */
  key: string;
  /** Route href */
  href: string;
  /** Translated label */
  label: string;
  icon?: React.ReactNode;
  highlighted?: boolean;
}

export interface MainNavbarProps {
  /** Pre-translated nav items to display */
  navItems: MainNavbarItem[];
  /** Keys of items to hide (e.g. when shown in a sub-layout) */
  hiddenNavItems?: string[];
  /** When true, renders the navbar inline instead of sticky */
  inline?: boolean;
  /** Whether a dashboard section has registered a secondary nav drawer. */
  hasDashboardNav?: boolean;
  /** Callback to toggle the dashboard nav drawer (already closes the public sidebar first). */
  onToggleDashboardNav?: () => void;
}

export function MainNavbar({
  navItems,
  hiddenNavItems = [],
  inline = false,
  hasDashboardNav = false,
  onToggleDashboardNav,
}: MainNavbarProps) {
  const pathname = usePathname();

  const items: NavbarLayoutItem[] = navItems
    .filter((item) => !hiddenNavItems.includes(item.key))
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      highlighted: item.highlighted,
    }));

  const dashboardToggle =
    hasDashboardNav && onToggleDashboardNav ? (
      <button
        type="button"
        onClick={onToggleDashboardNav}
        aria-label="Toggle dashboard navigation"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v18" />
        </svg>
      </button>
    ) : undefined;

  return (
    <NavbarLayout
      items={items}
      activeHref={pathname}
      inline={inline}
      rightSlot={dashboardToggle}
    />
  );
}
