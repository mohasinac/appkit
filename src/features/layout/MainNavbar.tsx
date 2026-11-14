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
  /**
   * A rendered icon, passed in CODE.
   *
   * ⚠ Prefer `iconName` for anything an operator might reasonably choose.
   * A React node is not serializable, so this field can never come from a
   * stored nav row — and a non-serializable value crossing the RSC boundary
   * is what caused this project's React #441 outage.
   */
  icon?: React.ReactNode;
  /**
   * The icon's NAME, from appkit's `NAV_ICON_REGISTRY` — the configurable rung.
   *
   * 🛑 Owner, 2026-11-14: *"icons and nav is a config."* This is the field
   * that makes that true. It is a plain string, so an app's `constants/nav.ts`
   * can declare it while staying a pure-DATA `.ts` module (no React import, no
   * `.tsx` rename), and a stored `navConfig` row can carry it unchanged
   * through JSON and Firestore.
   *
   * An unrecognised name falls through to the slot default and then to the
   * caller's fallback — never a throw, so newer config cannot break an older
   * deploy.
   */
  iconName?: string;
  highlighted?: boolean;
  /** Stable nav-* slug for siteSettings.navConfig toggling. */
  id?: string;
  /** RBAC permission key — item hidden when user lacks this permission. */
  requiredPermission?: string;
  /** Sub-items, rendered as a dropdown. One level only — see NavbarLayoutItem. */
  /*
   * `adminOnly` hides a child from everyone else. 🛑 It is a presentation
   * filter, NOT a security boundary — the whole nav tree already ships to
   * every browser (LayoutShellClient documents this and names the real fix),
   * so the guard that matters is the route's own server-side layout.
   */
  children?: Array<{
    href: string;
    label: string;
    description?: string;
    adminOnly?: boolean;
    /**
     * Optional stable key, mirroring the parent's. Consumers filter children on
     * it — a listing type an admin has switched off has to disappear from the
     * dropdown it moved into, and matching on a translated `label` would break
     * the moment a second locale ships.
     */
    key?: string;
    /** Same icon the child carried as a top-level item — a merged entry keeps
     *  its visual in the dropdown, the sidebar and the mobile sheet. */
    icon?: React.ReactNode;
  }>;
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
      ...(item.children?.length ? { children: item.children } : {}),
    }));

  const dashboardToggle =
    hasDashboardNav && onToggleDashboardNav ? (
      <button
        type="button"
        onClick={onToggleDashboardNav}
        aria-label="Toggle dashboard navigation"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--appkit-color-text-muted)] hover:bg-surface-hover hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
