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
import Link from "next/link";
import { useDashboardNav } from "../../../../features/layout/DashboardNavContext";
import { AdminSidebar, type AdminNavGroup } from "../../../../features/admin/components/AdminSidebar";
import { StoreSidebar, type StoreNavGroup } from "../../../../features/seller/components/SellerSidebar";
import { UserSidebar, type UserNavGroup } from "../../../../features/account/components/UserSidebar";
import type { DashboardVariant, SidebarNavGroup, SidebarNavItem, SectionResponsive } from "../../../shared/features/layout/types";
import { DASHBOARD_DESKTOP_MEDIA_QUERY } from "../../../shared/features/layout/config";
import { filterNavItems } from "./filterNavItems";
import { useSiteSettings } from "../../../../core/hooks/useSiteSettings";
import { useTheme } from "../../theme";
import { BackgroundRenderer, Div, Nav, Span, type BackgroundConfig } from "../../../../ui";
import { useVisualViewportInset } from "../../../../react/hooks/useVisualViewportInset";

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
  /**
   * Cross-dashboard nav links shown in the sidebar footer. Plain hrefs
   * rather than a render-prop — a Server Component caller (every real
   * consumer: admin/store/user layout.tsx) cannot legally pass a function
   * across the RSC boundary to this "use client" component, so the
   * previous `renderSidebarFooter?: () => ReactNode` shape was never
   * actually usable from where it needed to be used.
   */
  crossNav?: {
    /** Always-available "My Profile" shortcut — every dashboard user is also a user. */
    profileHref?: string;
    /** Admin only: shown when the signed-in admin also owns a store. */
    storeHref?: string;
    /** Seller only: shown when the signed-in seller account is also an admin/employee. */
    adminHref?: string;
  };
  /** Optional className passed through to the sidebar component. */
  className?: string;
  /** Override the content area padding classes. */
  contentPadding?: string;
  /** Additional className applied to the content area background. */
  contentSurface?: string;
  /** Override the max-width class on the inner content wrapper. */
  contentMaxWidth?: string;
  /** Background rendered behind the sidebar + content when the light theme is active. Mirrors `AppLayoutShell`'s prop of the same shape. */
  lightBackground?: BackgroundConfig;
  /** Background rendered behind the sidebar + content when the dark theme is active. */
  darkBackground?: BackgroundConfig;
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

const MAX_BOTTOM_NAV_ITEMS = 5;

/**
 * Mobile bottom tab bar (<lg) for the dashboard shells. Admin/store/user
 * previously had no bottom-nav — this was the source of "hard to navigate
 * on mobile" (the sidebar's only mobile affordance was an off-canvas drawer
 * behind a hamburger toggle). Pattern lifted from the unused
 * `DashboardScaffold` scaffold, which has since been retired in favour of
 * wiring it directly here where the sidebars already live.
 */
function DashboardBottomNav({ items, activeHref }: { items: SidebarNavItem[]; activeHref: string }) {
  const isKeyboardOpen = useVisualViewportInset();
  if (items.length === 0) return null;
  return (
    <Nav
      aria-label="Dashboard bottom navigation"
      aria-hidden={isKeyboardOpen}
      className={`fixed bottom-0 left-0 right-0 z-[var(--appkit-z-bottom-nav)] flex items-stretch justify-around border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] lg:hidden transition-transform duration-200 ease-out ${isKeyboardOpen ? "translate-y-full pointer-events-none" : "translate-y-0"}`}
    >
      {items.slice(0, MAX_BOTTOM_NAV_ITEMS).map((item) => {
        const isActive = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-[var(--appkit-space-0-5)] py-[var(--appkit-space-2)] ${isActive ? "text-[var(--appkit-color-primary)]" : "text-[var(--appkit-color-text-muted)]"}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon && <Span size="base">{item.icon}</Span>}
            <Span size="xs" className="max-w-full truncate">{item.label}</Span>
          </Link>
        );
      })}
    </Nav>
  );
}

const DEFAULT_CONTENT_PADDING = "px-[var(--appkit-space-5)] py-[var(--appkit-space-8)] lg:pl-14 lg:pr-6 xl:pl-16 xl:pr-10";
const DEFAULT_CONTENT_MAX_WIDTH = "max-w-screen-2xl";

export function DashboardLayoutClient({
  variant,
  groups,
  permissions,
  activeHref: explicitActiveHref,
  responsive: _responsive,
  crossNav,
  className,
  contentPadding,
  contentSurface,
  contentMaxWidth,
  lightBackground,
  darkBackground,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const activeHref = explicitActiveHref ?? pathname ?? "";
  const storageKey = `appkit:sidebar-open:${variant}`;
  const { desktopOpen, mobileOpen, close, closeMobile, toggle } = useResponsiveDrawer(storageKey);
  useEffect(() => { closeMobile(); }, [pathname, closeMobile]);
  const { data: settings } = useSiteSettings<{
    navConfig?: Record<string, { enabled: boolean }>;
    background?: { light?: BackgroundConfig; dark?: BackgroundConfig };
  }>();
  const navConfig = settings?.navConfig;
  const { theme } = useTheme();
  // Explicit props win; otherwise fall back to the same siteSettings.background
  // the public shell reads, so admin/store/user dashboards match it by default.
  const resolvedLightBackground = lightBackground ?? settings?.background?.light;
  const resolvedDarkBackground = darkBackground ?? settings?.background?.dark;
  const hasBackground = Boolean(resolvedLightBackground?.value || resolvedDarkBackground?.value);

  const filteredGroups = filterGroups(groups, navConfig, permissions);
  const adminGroups =
    variant === "admin"
      ? (filteredGroups as AdminNavGroup[])
      : (groups as AdminNavGroup[]);

  const crossNavLinkClass =
    "flex items-center gap-[var(--appkit-space-2)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[0.8125rem] font-medium text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface-elevated)]/60 hover:text-[var(--appkit-color-text)] transition-colors";
  const hasCrossNav = Boolean(crossNav?.profileHref || crossNav?.storeHref || crossNav?.adminHref);
  const renderCrossNavFooter = hasCrossNav
    ? () => (
        <Nav aria-label="Cross-dashboard links" padding="y-xs">
          {crossNav?.storeHref && (
            <Link href={crossNav.storeHref} onClick={closeMobile} className={crossNavLinkClass}>
              Go to my Store
            </Link>
          )}
          {crossNav?.adminHref && (
            <Link href={crossNav.adminHref} onClick={closeMobile} className={crossNavLinkClass}>
              Back to Admin
            </Link>
          )}
          {crossNav?.profileHref && (
            <Link href={crossNav.profileHref} onClick={closeMobile} className={crossNavLinkClass}>
              My Profile
            </Link>
          )}
        </Nav>
      )
    : undefined;

  return (
    <>
      {hasBackground && (
        <BackgroundRenderer
          mode={theme === "dark" ? "dark" : "light"}
          lightMode={resolvedLightBackground ?? { type: "color", value: "" }}
          darkMode={resolvedDarkBackground ?? { type: "color", value: "" }}
        />
      )}
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
          renderFooter={renderCrossNavFooter}
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
          renderFooter={renderCrossNavFooter}
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
          renderFooter={renderCrossNavFooter}
        />
      )}
      {/* Content area — full width on both mobile and desktop.
          md:pl-14 clears the sidebar toggle tab (w-9 = 2.25 rem) + margin so the toggle does not overlap.
          Inner wrapper caps width on ultra-wide screens so content does not flush to the far left. */}
      <Div className={[
        "w-full flex-1 flex flex-col min-h-[calc(100dvh-var(--header-height,3.5rem))]",
        "pb-[var(--appkit-space-16)] lg:pb-[0]", // clears the fixed mobile bottom-nav
        contentPadding ?? DEFAULT_CONTENT_PADDING,
        contentSurface,
      ].filter(Boolean).join(" ")}>
        <Div className={["w-full flex-1 mx-auto", contentMaxWidth ?? DEFAULT_CONTENT_MAX_WIDTH].filter(Boolean).join(" ")}>{children}</Div>
      </Div>
      <DashboardBottomNav items={filteredGroups.flatMap((g) => g.items)} activeHref={activeHref} />
    </>
  );
}
