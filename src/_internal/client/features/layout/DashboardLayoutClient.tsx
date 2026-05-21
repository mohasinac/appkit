"use client";

/**
 * DashboardLayoutClient — unified client island that replaces the ~75 lines of
 * boilerplate previously duplicated across admin/store/user layout.tsx files.
 *
 * Responsibilities:
 *  - Manage desktop + mobile drawer state (matchMedia-aware).
 *  - Register handlers with `useDashboardNav()` so the public TitleBar's
 *    hamburger forwards to this dashboard sidebar.
 *  - Pick the correct sidebar component for the supplied `variant`.
 *  - Resolve `activeHref` from `usePathname()` so consumers do not have to.
 *
 * Consumers pass:
 *   <DashboardLayoutClient variant="admin" groups={ADMIN_NAV_GROUPS}>
 *     {children}
 *   </DashboardLayoutClient>
 *
 * Theming: each variant uses its accent token map from shared/features/layout/config.
 * Responsive: sidebar is overlay on <md, persistent rail on ≥lg — controlled by
 * the underlying *Sidebar components.
 */

import { useCallback, useEffect, useState, startTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useDashboardNav } from "../../../../features/layout/DashboardNavContext";
import { AdminSidebar, type AdminNavGroup } from "../../../../features/admin/components/AdminSidebar";
import { StoreSidebar, type StoreNavGroup } from "../../../../features/seller/components/SellerSidebar";
import { UserSidebar, type UserNavGroup } from "../../../../features/account/components/UserSidebar";
import type { DashboardVariant, SidebarNavGroup, SectionResponsive } from "../../../shared/features/layout/types";
import { DASHBOARD_DESKTOP_MEDIA_QUERY } from "../../../shared/features/layout/config";
import { filterNavItems } from "./filterNavItems";
import { useSiteSettings } from "../../../../core/hooks/useSiteSettings";

export interface DashboardLayoutClientProps {
  /** Drives sidebar component selection + accent colour. */
  variant: DashboardVariant;
  /** Grouped nav items. Shape matches all three sidebar components. */
  groups: SidebarNavGroup[];
  /**
   * Resolved permissions for the current user (serialised from RSC layout).
   * When provided, nav items with `requiredPermission` are filtered server-side
   * before reaching this component; pass `null` to skip (admin sees everything).
   * When absent, all items are shown (backwards-compatible).
   */
  permissions?: string[] | null;
  /** Override active-link highlight. Defaults to usePathname(). */
  activeHref?: string;
  /** Responsive controls — currently only hideAt is honoured. */
  responsive?: SectionResponsive;
  /** Optional render-prop slot for additional sidebar footer content. */
  renderSidebarFooter?: () => ReactNode;
  /** Optional className passed through to the sidebar component. */
  className?: string;
  children: ReactNode;
}

/**
 * Hoisted drawer-state hook — the matchMedia-aware open/close logic that was
 * triplicated across admin/store/user layouts. Used internally by
 * DashboardLayoutClient; not exported because it's not generically useful.
 */
function useResponsiveDrawer() {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { registerNav, unregisterNav } = useDashboardNav();

  const isDesktop = useCallback(
    () => typeof window !== "undefined" && window.matchMedia(DASHBOARD_DESKTOP_MEDIA_QUERY).matches,
    [],
  );

  const open = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) setDesktopOpen(true);
      else setMobileOpen(true);
    });
  }, [isDesktop]);

  const close = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) setDesktopOpen(false);
      else setMobileOpen(false);
    });
  }, [isDesktop]);

  const toggle = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) setDesktopOpen((prev) => !prev);
      else setMobileOpen((prev) => !prev);
    });
  }, [isDesktop]);

  useEffect(() => {
    registerNav({ open, close, toggle });
    return () => unregisterNav();
  }, [registerNav, unregisterNav, open, close, toggle]);

  return { desktopOpen, mobileOpen, close, toggle };
}

/** Filter nav groups by navConfig (enabled toggle) + requiredPermission. */
function filterGroups<T extends SidebarNavGroup>(
  groups: T[],
  navConfig: Record<string, { enabled: boolean }> | undefined,
  permissions: string[] | null | undefined,
): T[] {
  // null permissions = admin (show everything); undefined = no filtering (backwards compat)
  if (permissions === null && !navConfig) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, navConfig, permissions ?? undefined),
    }))
    .filter((group) => group.items.length > 0) as T[];
}

export function DashboardLayoutClient({
  variant,
  groups,
  permissions,
  activeHref: explicitActiveHref,
  responsive: _responsive,
  className,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const activeHref = explicitActiveHref ?? pathname ?? "";
  const { desktopOpen, mobileOpen, close, toggle } = useResponsiveDrawer();
  const { data: settings } = useSiteSettings<{ navConfig?: Record<string, { enabled: boolean }> }>();
  const navConfig = (settings as { navConfig?: Record<string, { enabled: boolean }> } | undefined)?.navConfig;

  const filteredGroups = filterGroups(groups, navConfig, permissions);
  const adminGroups =
    variant === "admin"
      ? (filteredGroups as AdminNavGroup[])
      : (groups as AdminNavGroup[]);

  return (
    <>
      {variant === "admin" && (
        <AdminSidebar
          variant="sidebar"
          desktopOpen={desktopOpen}
          mobileOpen={mobileOpen}
          activePath={activeHref}
          groups={adminGroups}
          onCloseMobile={close}
          onToggle={toggle}
          className={className}
        />
      )}
      {variant === "store" && (
        <StoreSidebar
          variant="sidebar"
          desktopOpen={desktopOpen}
          mobileOpen={mobileOpen}
          activeHref={activeHref}
          items={[]}
          groups={filteredGroups as StoreNavGroup[]}
          onCloseMobile={close}
          onToggle={toggle}
          className={className}
        />
      )}
      {variant === "user" && (
        <UserSidebar
          variant="sidebar"
          desktopOpen={desktopOpen}
          mobileOpen={mobileOpen}
          items={filteredGroups.flatMap((g) => g.items)}
          groups={filteredGroups as UserNavGroup[]}
          onCloseMobile={close}
          onToggle={toggle}
          className={className}
        />
      )}
      {/* Content area — full width on both mobile and desktop.
          md:pl-14 clears the sidebar toggle tab (w-9 = 2.25 rem) + margin so the toggle does not overlap.
          Inner wrapper caps width on ultra-wide screens so content does not flush to the far left. */}
      <div className="w-full flex-1 flex flex-col px-5 py-8 md:pl-14 md:pr-6 lg:pl-16 lg:pr-10 min-h-[calc(100dvh-var(--header-height,3.5rem))]">
        <div className="w-full flex-1 max-w-screen-2xl mx-auto">{children}</div>
      </div>
    </>
  );
}
