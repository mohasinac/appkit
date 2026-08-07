"use client";
import { normalizeError } from "../../../../errors/normalize";

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
import { Div } from "../../../../ui";

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
  /** Override the content area padding classes. */
  contentPadding?: string;
  /** Additional className applied to the content area background. */
  contentSurface?: string;
  /** Override the max-width class on the inner content wrapper. */
  contentMaxWidth?: string;
  children: ReactNode;
}

/**
 * Hoisted drawer-state hook — the matchMedia-aware open/close logic that was
 * triplicated across admin/store/user layouts. Used internally by
 * DashboardLayoutClient; not exported because it's not generically useful.
 *
 * storageKey: variant-scoped localStorage key (`appkit:sidebar-open:{variant}`)
 * so admin/store/user each persist their own collapse state independently.
 */
function useResponsiveDrawer(storageKey: string) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { registerNav, unregisterNav } = useDashboardNav();

  const isDesktop = useCallback(
    () => typeof window !== "undefined" && window.matchMedia(DASHBOARD_DESKTOP_MEDIA_QUERY).matches,
    [],
  );

  // Restore persisted desktop-open state after hydration (avoids SSR mismatch).
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "true") setDesktopOpen(true);
    } catch (_err) {
      void normalizeError(_err); /* localStorage unavailable (private-browse / SSR fallback) */
    }
  }, [storageKey]);

  const open = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) {
        try { localStorage.setItem(storageKey, "true"); } catch (_err) { void normalizeError(_err); }
        setDesktopOpen(true);
      } else setMobileOpen(true);
    });
  }, [isDesktop, storageKey]);

  const close = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) {
        try { localStorage.setItem(storageKey, "false"); } catch (_err) { void normalizeError(_err); }
        setDesktopOpen(false);
      } else setMobileOpen(false);
    });
  }, [isDesktop, storageKey]);

  // Close only the mobile drawer — used on route change so desktop sidebar stays persistent.
  const closeMobile = useCallback(() => {
    startTransition(() => { setMobileOpen(false); });
  }, []);

  const toggle = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) {
        setDesktopOpen((prev) => {
          const next = !prev;
          try { localStorage.setItem(storageKey, String(next)); } catch (_err) { void normalizeError(_err); }
          return next;
        });
      } else setMobileOpen((prev) => !prev);
    });
  }, [isDesktop, storageKey]);

  useEffect(() => {
    registerNav({ open, close, toggle });
    return () => unregisterNav();
  }, [registerNav, unregisterNav, open, close, toggle]);

  return { desktopOpen, mobileOpen, close, closeMobile, toggle };
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

const DEFAULT_CONTENT_PADDING = "px-5 py-8 lg:pl-14 lg:pr-6 xl:pl-16 xl:pr-10";
const DEFAULT_CONTENT_MAX_WIDTH = "max-w-screen-2xl";

export function DashboardLayoutClient({
  variant,
  groups,
  permissions,
  activeHref: explicitActiveHref,
  responsive: _responsive,
  className,
  contentPadding,
  contentSurface,
  contentMaxWidth,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const activeHref = explicitActiveHref ?? pathname ?? "";
  const storageKey = `appkit:sidebar-open:${variant}`;
  const { desktopOpen, mobileOpen, close, closeMobile, toggle } = useResponsiveDrawer(storageKey);
  useEffect(() => { closeMobile(); }, [pathname, closeMobile]);
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
      <Div className={[
        "w-full flex-1 flex flex-col min-h-[calc(100dvh-var(--header-height,3.5rem))]",
        contentPadding ?? DEFAULT_CONTENT_PADDING,
        contentSurface,
      ].filter(Boolean).join(" ")}>
        <Div className={["w-full flex-1 mx-auto", contentMaxWidth ?? DEFAULT_CONTENT_MAX_WIDTH].filter(Boolean).join(" ")}>{children}</Div>
      </Div>
    </>
  );
}
