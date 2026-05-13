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

/** Filter admin nav groups to only show items the user has permission to see. */
function filterAdminGroups(
  groups: AdminNavGroup[],
  permissions: string[] | null | undefined,
): AdminNavGroup[] {
  // null = admin (show everything); undefined = no filtering (backwards compat)
  if (permissions === null || permissions === undefined) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.requiredPermission ||
          permissions.includes(item.requiredPermission),
      ),
    }))
    .filter((group) => group.items.length > 0);
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

  const adminGroups =
    variant === "admin"
      ? filterAdminGroups(groups as AdminNavGroup[], permissions)
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
          groups={groups as StoreNavGroup[]}
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
          items={groups.flatMap((g) => g.items)}
          groups={groups as UserNavGroup[]}
          onCloseMobile={close}
          onToggle={toggle}
          className={className}
        />
      )}
      {children}
    </>
  );
}
