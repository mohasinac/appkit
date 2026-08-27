"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
// QueryClientProvider intentionally NOT imported here. Consumer's QueryProvider
// owns the singleton; nesting another would risk Turbopack chunk-splitting.
// The actual 2.8.8 SSR crash was a peer-dep duplicate fixed by the
// scripts/dedupe-peer-deps.mjs postinstall hook (see scripts/ and CLAUDE.md #19).
import { AvatarDisplay, BackgroundRenderer, Div, Li, Main, Row, Span, Stack, Text, TextLink, Ul, UnsavedChangesModal } from "../../ui";
// Role indicator dots — distinct hues per role tier.
const ROLE_DOT_BG_CLASS: Record<string, string> = {
  admin: "bg-purple-600",
  moderator: "bg-sky-500",
  seller: "bg-teal-600",
  employee: "bg-amber-500",
};
import { useTheme } from "../../_internal/client/theme";
import { useAuth } from "../../react/contexts/SessionContext";
import { useVisualViewportInset } from "../../react/hooks/useVisualViewportInset";
import { isBuyerUser } from "../auth/role-predicates";
import { NavbarWithSettings } from "./NavbarWithSettings";
import BottomActions from "./BottomActions";
import { BottomChrome } from "./BottomChrome";
import { AutoBreadcrumbs } from "./AutoBreadcrumbs";
import { BottomNavbar, type BottomNavbarUser } from "./BottomNavbar";
import { FooterLayout, type FooterLayoutProps } from "./FooterLayout";
import { type MainNavbarItem } from "./MainNavbar";
import { SidebarLayout } from "./SidebarLayout";
import { TitleBar } from "./TitleBar";
import { BackToTop } from "./BackToTop";
import { useDashboardNav } from "./DashboardNavContext";
import { usePathname } from "next/navigation";
import { findActiveNavItem } from "../../_internal/client/features/layout/navActive";

/** A single sidebar link. */
export interface AppLayoutShellSidebarLink {
  href: string;
  label: string;
  /** Optional icon rendered before the label (emoji string or ReactNode). */
  icon?: React.ReactNode;
}

export interface AppLayoutShellSidebarSection {
  title?: string;
  items: AppLayoutShellSidebarLink[];
  /** When true, this section is expanded by default. */
  defaultOpen?: boolean;
}

export interface AppLayoutShellSidebarAction {
  href: string;
  label: string;
  variant?: "primary" | "outline";
}

export interface AppLayoutShellProps {
  children: React.ReactNode;
  navItems: MainNavbarItem[];
  sidebarItems?: AppLayoutShellSidebarLink[];
  sidebarSections?: AppLayoutShellSidebarSection[];
  sidebarPrimaryActions?: AppLayoutShellSidebarAction[];
  sidebarTitle?: string;
  hiddenNavItems?: string[];
  user?: BottomNavbarUser | null;
  brandName: string;
  brandShortName?: string;
  /** Admin-uploaded site logo URL. Falls back to the SVG wordmark when empty. */
  siteLogoUrl?: string;
  logoHref: string;
  promotionsHref?: string;
  cartHref: string;
  wishlistHref?: string;
  /** Auth UID passed through to TitleBar for wishlist merge-on-login and sync. */
  userId?: string | null;
  profileHref: string;
  loginHref: string;
  registerHref?: string;
  homeHref: string;
  shopHref: string;
  footer: FooterLayoutProps;
  searchSlot?: React.ReactNode;
  /** Render-prop alternative to searchSlot — receives onClose so the slot can close the overlay. */
  searchSlotRenderer?: (onClose: () => void) => React.ReactNode;
  titleBarNavSlot?: React.ReactNode;
  titleBarNotificationSlot?: React.ReactNode;
  titleBarDevSlot?: React.ReactNode;
  titleBarPromoStripText?: string;
  showThemeToggle?: boolean;
  suppressDashboardNav?: boolean;
  hideSidebarToggle?: boolean;
  /** Callback invoked when user clicks logout in the sidebar. */
  onLogout?: () => void;
  /** Href for the admin dashboard — shown in sidebar Dashboard section when user.role is admin. */
  adminHref?: string;
  /** Href for the store management dashboard — shown in sidebar Dashboard section when user.role is admin or seller. */
  storeHref?: string;
  /** @deprecated Use storeHref */
  sellerHref?: string;
  /** Href for the user orders page — auto-generates PROFILE section in sidebar. */
  userOrdersHref?: string;
  /** Href for the user wishlist page — auto-generates PROFILE section in sidebar. */
  userWishlistHref?: string;
  /** Href for the user settings page — auto-generates PROFILE section in sidebar. */
  userSettingsHref?: string;
  /** Locale switcher node rendered at the bottom of the sidebar. */
  sidebarLocaleSlot?: React.ReactNode;
  /** When true, shows theme toggle button in the sidebar footer. */
  showThemeToggleInSidebar?: boolean;
  /** Override labels for the auto-generated profile section in the sidebar. */
  sidebarProfileLabels?: {
    sectionTitle?: string;
    profile?: string;
    orders?: string;
    wishlist?: string;
    settings?: string;
    dashboardSectionTitle?: string;
    adminDashboard?: string;
    storeDashboard?: string;
    /** @deprecated Use storeDashboard */
    sellerDashboard?: string;
    logout?: string;
  };
  eventBannerSlot?: React.ReactNode;
  /**
   * Render the public mobile tab bar. Defaults to `true`.
   *
   * Set `false` on routes that mount their own bottom nav — `DashboardLayoutClient`
   * renders a section-scoped one for /admin, /store and /user. Only ONE bottom nav
   * may be mounted at a time: both are `fixed bottom-0` at the same z-index, so two
   * stack on the identical pixels, and both publish `--bottom-nav-height`, which
   * every offset above them reads.
   */
  showBottomNav?: boolean;
  /** When provided, renders a tour-start icon button in the title bar. Null in Patch 1. */
  onTourStart?: () => void;
  /**
   * Override className for the main content wrapper div.
   * When set, replaces the default `w-full px-4 py-6 …`
   * Use `"w-full"` for dashboard layouts that provide their own padding via DashboardLayoutClient.
   */
  contentClassName?: string;
  lightBackground?: {
    type: "color" | "image" | "gradient" | "video";
    value: string;
    overlay?: { enabled?: boolean; color?: string; opacity?: number };
  };
  darkBackground?: {
    type: "color" | "image" | "gradient" | "video";
    value: string;
    overlay?: { enabled?: boolean; color?: string; opacity?: number };
  };
}

import { OVERLAY_FALLBACK_COLOR, SEED_DARK_BG as DEFAULT_DARK_BG, SEED_LIGHT_BG as DEFAULT_LIGHT_BG } from "./background-seed-defaults";

const CLS_STAT_BOX = "flex flex-col items-center gap-[var(--appkit-space-1)] p-[var(--appkit-space-2)] bg-[var(--appkit-color-surface)] rounded-lg text-center";
const CLS_STAT_LABEL = "text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)]";
const CLS_LOGOUT_BTN = "flex w-full items-center justify-end gap-[var(--appkit-space-3)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-error transition-colors hover:bg-error-surface hover:text-error dark:text-error dark:hover:bg-error-surface dark:hover:text-error";

/** Collapsible accordion section for the public sidebar. */
function CollapsibleNavGroup({
  title,
  hasActive = false,
  children,
}: {
  title: string;
  /** True when the active route matches one of this group's links — auto-expands and re-expands on navigation. */
  hasActive?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(hasActive);
  // Re-sync whenever the route changes — the sidebar stays mounted across
  // client-side navigation, so the lazy initial state above only fires once.
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);
  return (
    <Stack gap="none" className="">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-[var(--appkit-space-1)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] font-semibold uppercase tracking-wider text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text-muted)] transition-colors"
      >
        <Span>{title}</Span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""} shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <Stack gap="none" className="">{children}</Stack>}
    </Stack>
  );
}

function CollapsibleSidebarSection({
  section,
  navItemClass,
  navItemActiveClass,
  activeHref,
}: {
  section: AppLayoutShellSidebarSection;
  navItemClass: string;
  navItemActiveClass: string;
  activeHref: string;
}) {
  const activeItem = findActiveNavItem(section.items, activeHref);
  const hasActive = !!activeItem;
  const [open, setOpen] = useState((section.defaultOpen ?? false) || hasActive);
  // Re-sync whenever the route changes — the sidebar stays mounted across
  // client-side navigation, so the lazy initial state above only fires once.
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);
  const hasTitle = !!section.title;

  if (!hasTitle) {
    return (
      <Ul spacing="2xs">
        {section.items.map((item) => {
          const isActive = activeItem?.href === item.href;
          return (
            <Li key={`${item.href}-${item.label}`}>
              <TextLink
                href={item.href}
                variant="none"
                className={isActive ? navItemActiveClass : navItemClass}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon && (
                  <Span className="flex-shrink-0 w-5 text-center" aria-hidden="true">
                    {item.icon}
                  </Span>
                )}
                {item.label}
              </TextLink>
            </Li>
          );
        })}
      </Ul>
    );
  }

  return (
    <Stack gap="none" className="">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-[var(--appkit-space-1)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] font-semibold uppercase tracking-wider text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text-muted)] transition-colors"
      >
        <Span>{section.title}</Span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""} shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <Ul spacing="2xs">
          {section.items.map((item) => {
            const isActive = activeItem?.href === item.href;
            return (
              <Li key={`${item.href}-${item.label}`}>
                <TextLink
                  href={item.href}
                  variant="none"
                  className={isActive ? navItemActiveClass : navItemClass}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon && (
                    <Span className="flex-shrink-0 w-5 text-center" aria-hidden="true">
                      {item.icon}
                    </Span>
                  )}
                  {item.label}
                </TextLink>
              </Li>
            );
          })}
        </Ul>
      )}
    </Stack>
  );
}

/** Sidebar header when a user is logged in — avatar + display name + close button. */
function SidebarUserHeader({
  user,
  onClose,
}: {
  user: BottomNavbarUser;
  onClose: () => void;
}) {
  return (
    <Row align="center" justify="between" gap="3">
      <Row className="flex-1 min-w-0" align="center" gap="3">
        <Div className="flex-shrink-0 relative">
          <AvatarDisplay
            cropData={
              user.avatarMetadata
                ? {
                    url: user.avatarMetadata.url,
                    position: user.avatarMetadata.position ?? { x: 50, y: 50 },
                    zoom: user.avatarMetadata.zoom ?? 1,
                  }
                : user.photoURL
                  ? { url: user.photoURL, position: { x: 50, y: 50 }, zoom: 1 }
                  : null
            }
            size="md"
            alt={user.displayName || "User"}
            displayName={user.displayName}
            email={user.email}
          />
          {user.role && !isBuyerUser(user) && (
            <Row textWeight="bold"
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white text-white text-[9px] leading-none select-none ${ROLE_DOT_BG_CLASS[user.role] ?? "bg-[var(--appkit-color-text-muted)]"}`} align="center" justify="center" rounded="full"
              title={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              aria-label={user.role}
            >
              {user.role.charAt(0).toUpperCase()}
            </Row>
          )}
        </Div>
        <Div className="flex-1 min-w-0">
          <Text className="truncate" color="primary" size="sm" weight="medium">
            {user.displayName || "User"}
          </Text>
          <Text className="truncate" color="muted" size="xs">
            {user.email || ""}
          </Text>
        </Div>
      </Row>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="flex-shrink-0 rounded-full p-[var(--appkit-space-2)] text-[var(--appkit-color-text-muted)] hover:bg-surface-hover hover:text-zinc-900 text-[var(--appkit-color-text-muted)] dark:hover:text-zinc-100 transition-all hover:rotate-90"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Row>
  );
}

/** Sidebar header when no user is logged in — title + close button. */
function SidebarGuestHeader({
  sidebarTitle,
  onClose,
}: {
  sidebarTitle: string;
  onClose: () => void;
}) {
  return (
    <Row align="center" justify="between">
      <Div textWeight="semibold" textSize="sm" color="primary">{sidebarTitle}</Div>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="rounded-full p-[var(--appkit-space-2)] text-[var(--appkit-color-text-muted)] hover:bg-surface-hover hover:text-zinc-900 text-[var(--appkit-color-text-muted)] dark:hover:text-zinc-100 transition-all hover:rotate-90"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Row>
  );
}

// ─── SidebarContent sub-component ─────────────────────────────────────────────

interface SidebarContentProps {
  sidebarItems: AppLayoutShellSidebarLink[];
  sidebarSections?: AppLayoutShellSidebarSection[];
  sidebarPrimaryActions?: Array<{ href: string; label: string; variant?: "primary" | "outline" }>;
  user?: BottomNavbarUser | null;
  /** Current pathname — drives active-item highlighting and auto-expand of the containing section. */
  activeHref: string;
  profileHref: string;
  userOrdersHref?: string;
  userWishlistHref?: string;
  userSettingsHref?: string;
  adminHref?: string;
  storeHref?: string;
  sellerHref?: string;
  sidebarLocaleSlot?: React.ReactNode;
  showThemeToggleInSidebar?: boolean;
  sidebarProfileLabels?: AppLayoutShellProps["sidebarProfileLabels"];
  theme: "light" | "dark";
  activeThemeName: string;
  toggleTheme: () => void;
  onLogout?: () => void;
  onAfterLogout: () => void;
}

function SidebarContent({
  sidebarItems,
  sidebarSections,
  sidebarPrimaryActions,
  user,
  activeHref,
  profileHref,
  userOrdersHref,
  userWishlistHref,
  userSettingsHref,
  adminHref,
  storeHref,
  sellerHref,
  sidebarLocaleSlot,
  showThemeToggleInSidebar,
  sidebarProfileLabels,
  theme,
  activeThemeName,
  toggleTheme,
  onLogout,
  onAfterLogout,
}: SidebarContentProps) {
  const hasLegacyItems = sidebarItems.length > 0;
  const hasSections = !!(sidebarSections && sidebarSections.length > 0);
  const isAuthenticated = !!user;
  const role = user?.role ?? "user";
  const isAdminOrSeller = role === "admin" || role === "seller";
  const resolvedStoreHref = storeHref ?? sellerHref;

  const labels = {
    sectionTitle: sidebarProfileLabels?.sectionTitle ?? "Profile",
    profile: sidebarProfileLabels?.profile ?? "My Profile",
    orders: sidebarProfileLabels?.orders ?? "My Orders",
    wishlist: sidebarProfileLabels?.wishlist ?? "My Wishlist",
    settings: sidebarProfileLabels?.settings ?? "Settings",
    dashboardSectionTitle: sidebarProfileLabels?.dashboardSectionTitle ?? "Dashboard",
    adminDashboard: sidebarProfileLabels?.adminDashboard ?? "Admin Dashboard",
    storeDashboard: sidebarProfileLabels?.storeDashboard ?? sidebarProfileLabels?.sellerDashboard ?? "Store Dashboard",
    logout: sidebarProfileLabels?.logout ?? "Logout",
  };

  const navItemClass =
  "flex w-full items-center justify-end gap-[var(--appkit-space-2)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] transition-colors hover:bg-primary-surface hover:text-primary-800 text-[var(--appkit-color-text-muted)] dark:hover:text-secondary-300";
  const navItemActiveClass =
    "flex w-full items-center justify-end gap-[var(--appkit-space-2)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-medium bg-primary-50 text-primary-800 dark:bg-primary-900/25 dark:text-primary-300";

  const profileLinks = [
    { href: profileHref },
    ...(userOrdersHref ? [{ href: userOrdersHref }] : []),
    ...(userWishlistHref ? [{ href: userWishlistHref }] : []),
    ...(userSettingsHref ? [{ href: userSettingsHref }] : []),
  ];
  const activeProfileLink = findActiveNavItem(profileLinks, activeHref);

  const dashboardLinks = [
    ...(adminHref ? [{ href: adminHref }] : []),
    ...(resolvedStoreHref ? [{ href: resolvedStoreHref }] : []),
  ];
  const activeDashboardLink = findActiveNavItem(dashboardLinks, activeHref);

  const normalizedSections: AppLayoutShellSidebarSection[] = hasSections
    ? (sidebarSections as AppLayoutShellSidebarSection[])
    : hasLegacyItems
      ? [{ items: sidebarItems }]
      : [];

  return (
    <Stack gap="lg">
      {!isAuthenticated && sidebarPrimaryActions && sidebarPrimaryActions.length > 0 && (
        <Stack gap="sm">
          {sidebarPrimaryActions.map((action) => (
            <TextLink
              key={`${action.href}-${action.label}`}
              href={action.href}
              variant="none"
              className={[
                "block w-full rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2-5)] text-center text-[length:var(--appkit-text-sm)] font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm",
                action.variant === "outline"
                  ? "border hover:bg-surface-hover border-[var(--appkit-color-border)] text-[var(--appkit-color-text)]"
                  : "bg-primary text-white hover:bg-primary-600 dark:bg-primary dark:hover:bg-primary-600 btn-glow",
              ].join(" ")}
            >
              {action.label}
            </TextLink>
          ))}
        </Stack>
      )}

      {isAuthenticated && (
        <CollapsibleNavGroup title={labels.sectionTitle} hasActive={!!activeProfileLink}>
          <Ul spacing="2xs">
            <Li>
              <TextLink
                href={profileHref}
                variant="none"
                className={activeProfileLink?.href === profileHref ? navItemActiveClass : navItemClass}
                aria-current={activeProfileLink?.href === profileHref ? "page" : undefined}
              >
                {labels.profile}
              </TextLink>
            </Li>
            {userOrdersHref && (
              <Li>
                <TextLink
                  href={userOrdersHref}
                  variant="none"
                  className={activeProfileLink?.href === userOrdersHref ? navItemActiveClass : navItemClass}
                  aria-current={activeProfileLink?.href === userOrdersHref ? "page" : undefined}
                >
                  {labels.orders}
                </TextLink>
              </Li>
            )}
            {userWishlistHref && (
              <Li>
                <TextLink
                  href={userWishlistHref}
                  variant="none"
                  className={activeProfileLink?.href === userWishlistHref ? navItemActiveClass : navItemClass}
                  aria-current={activeProfileLink?.href === userWishlistHref ? "page" : undefined}
                >
                  {labels.wishlist}
                </TextLink>
              </Li>
            )}
            {userSettingsHref && (
              <Li>
                <TextLink
                  href={userSettingsHref}
                  variant="none"
                  className={activeProfileLink?.href === userSettingsHref ? navItemActiveClass : navItemClass}
                  aria-current={activeProfileLink?.href === userSettingsHref ? "page" : undefined}
                >
                  {labels.settings}
                </TextLink>
              </Li>
            )}
          </Ul>
        </CollapsibleNavGroup>
      )}

      {isAuthenticated && user?.stats && (
        <Div layout="grid" gap="2" className="grid-cols-2">
          {user.stats.totalOrders != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.totalOrders}</Text>
              <Text className={CLS_STAT_LABEL}>Orders</Text>
            </Div>
          )}
          {user.stats.reviewsCount != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.reviewsCount}</Text>
              <Text className={CLS_STAT_LABEL}>Reviews</Text>
            </Div>
          )}
          {user.stats.auctionsWon != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.auctionsWon}</Text>
              <Text className={CLS_STAT_LABEL}>Auctions Won</Text>
            </Div>
          )}
          {user.stats.itemsSold != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.itemsSold}</Text>
              <Text className={CLS_STAT_LABEL}>Items Sold</Text>
            </Div>
          )}
        </Div>
      )}

      {isAuthenticated && isAdminOrSeller && (adminHref || resolvedStoreHref) && (
        <CollapsibleNavGroup title={labels.dashboardSectionTitle} hasActive={!!activeDashboardLink}>
          <Ul spacing="2xs">
            {adminHref && role === "admin" && (
              <Li>
                <TextLink
                  href={adminHref}
                  variant="none"
                  className={activeDashboardLink?.href === adminHref ? navItemActiveClass : navItemClass}
                  aria-current={activeDashboardLink?.href === adminHref ? "page" : undefined}
                >
                  {labels.adminDashboard}
                </TextLink>
              </Li>
            )}
            {resolvedStoreHref && isAdminOrSeller && (
              <Li>
                <TextLink
                  href={resolvedStoreHref}
                  variant="none"
                  className={activeDashboardLink?.href === resolvedStoreHref ? navItemActiveClass : navItemClass}
                  aria-current={activeDashboardLink?.href === resolvedStoreHref ? "page" : undefined}
                >
                  {labels.storeDashboard}
                </TextLink>
              </Li>
            )}
          </Ul>
        </CollapsibleNavGroup>
      )}

      {normalizedSections.map((section, sectionIndex) => (
        <CollapsibleSidebarSection
          key={`sidebar-section-${sectionIndex}`}
          section={section}
          navItemClass={navItemClass}
          navItemActiveClass={navItemActiveClass}
          activeHref={activeHref}
        />
      ))}

      {(sidebarLocaleSlot || showThemeToggleInSidebar || (isAuthenticated && onLogout)) && (
        <Stack border="default" className="border-t border-[var(--appkit-color-border-subtle)]" padding="t-md" gap="3">
          {sidebarLocaleSlot}
          {showThemeToggleInSidebar && (
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-end gap-[var(--appkit-space-3)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text-muted)] transition-colors hover:bg-primary-surface hover:text-primary-800"
            >
              <Span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</Span>
              {activeThemeName}
            </button>
          )}
          {isAuthenticated && onLogout && (
            <button
              type="button"
              onClick={() => { onLogout(); onAfterLogout(); }}
              className={CLS_LOGOUT_BTN}
            >
              {labels.logout}
            </button>
          )}
        </Stack>
      )}
    </Stack>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AppLayoutShell({
  children,
  navItems,
  sidebarItems = [],
  sidebarSections,
  sidebarPrimaryActions,
  sidebarTitle = "Navigation",
  hiddenNavItems,
  user,
  brandName,
  brandShortName,
  siteLogoUrl,
  logoHref,
  promotionsHref,
  cartHref,
  wishlistHref,
  userId,
  profileHref,
  loginHref,
  registerHref,
  homeHref,
  shopHref,
  footer,
  searchSlot,
  searchSlotRenderer,
  titleBarNavSlot,
  titleBarNotificationSlot,
  titleBarDevSlot,
  titleBarPromoStripText,
  showThemeToggle = false,
  suppressDashboardNav = false,
  hideSidebarToggle = false,
  onLogout,
  adminHref,
  storeHref,
  sellerHref,
  userOrdersHref,
  userWishlistHref,
  userSettingsHref,
  sidebarLocaleSlot,
  showThemeToggleInSidebar = false,
  sidebarProfileLabels,
  eventBannerSlot,
  showBottomNav = true,
  onTourStart,
  contentClassName,
  lightBackground = DEFAULT_LIGHT_BG,
  darkBackground = DEFAULT_DARK_BG,
}: AppLayoutShellProps) {
  // QueryClientProvider used to be created here so AppLayoutShell could stand
  // alone. The real cause of the 2026-06-10/11 "No QueryClient set" prod crash
  // turned out to be a peer-dep duplicate of @tanstack/query-core under
  // appkit/node_modules/ (fixed by scripts/dedupe-peer-deps.mjs in the
  // postinstall hook). Keeping this nested provider removed regardless because
  // a single consumer-level QueryProvider is the correct architecture.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  const { theme, toggleTheme, activeTheme } = useTheme();
  const { closeNav: closeDashboardNav, hasNav: hasDashboardNav, toggleNav: toggleDashboardNav } = useDashboardNav();
  const { user: authUser } = useAuth();

  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--header-height", `${el.offsetHeight}px`);
    });
    observer.observe(el);
    document.documentElement.style.setProperty("--header-height", `${el.offsetHeight}px`);
    return () => observer.disconnect();
  }, []);

  // Writes --keyboard-inset-height to :root so any fixed/sticky element
  // (BottomActions, BackToTop, FormShell/FormActionBar footers) can offset
  // itself above the on-screen keyboard via CSS calc() alone. BottomNavLayout
  // additionally calls this hook itself for its own hide-on-keyboard branch.
  useVisualViewportInset();

  const handleTogglePublicSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next) closeDashboardNav();
      return next;
    });
  }, [closeDashboardNav]);

  const handleBeforeDashboardNavToggle = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // The shell used to mirror BottomActions' `isVisible` here to pick a margin
  // for <Main>, and a comment warned it had to be kept in sync by hand (it had
  // already drifted once — `secondaryLabel` was missing, so an auction bar shown
  // by its countdown alone got no clearance). That mirror is gone: BottomChrome
  // measures the real tier and publishes --bottom-chrome-height, and the footer
  // reserves space from that. Nothing needs to guess any more.

  const sidebarContent = (
    <SidebarContent
      sidebarItems={sidebarItems}
      sidebarSections={sidebarSections}
      sidebarPrimaryActions={sidebarPrimaryActions}
      user={user}
      activeHref={pathname ?? ""}
      profileHref={profileHref}
      userOrdersHref={userOrdersHref}
      userWishlistHref={userWishlistHref}
      userSettingsHref={userSettingsHref}
      adminHref={adminHref}
      storeHref={storeHref}
      sellerHref={sellerHref}
      sidebarLocaleSlot={sidebarLocaleSlot}
      showThemeToggleInSidebar={showThemeToggleInSidebar}
      sidebarProfileLabels={sidebarProfileLabels}
      theme={theme}
      activeThemeName={activeTheme.name}
      toggleTheme={toggleTheme}
      onLogout={onLogout}
      onAfterLogout={() => setSidebarOpen(false)}
    />
  );

  const normalizedLightBackground = {
    type: lightBackground.type,
    value: lightBackground.value,
    overlay: {
      enabled: lightBackground.overlay?.enabled ?? false,
      color: lightBackground.overlay?.color ?? OVERLAY_FALLBACK_COLOR,
      opacity: lightBackground.overlay?.opacity ?? 0,
    },
  };

  const normalizedDarkBackground = {
    type: darkBackground.type,
    value: darkBackground.value,
    overlay: {
      enabled: darkBackground.overlay?.enabled ?? false,
      color: darkBackground.overlay?.color ?? OVERLAY_FALLBACK_COLOR,
      opacity: darkBackground.overlay?.opacity ?? 0,
    },
  };

  return (
    <>
      <Stack className="min-h-screen w-full overflow-x-clip transition-colors duration-300">
        <BackgroundRenderer
          mode={theme === "dark" ? "dark" : "light"}
          lightMode={normalizedLightBackground}
          darkMode={normalizedDarkBackground}
        />

        <Div ref={headerRef} className="sticky top-0 z-50 w-full">
          <TitleBar
            onToggleSidebar={handleTogglePublicSidebar}
            sidebarOpen={sidebarOpen}
            onSearchToggle={() => setSearchOpen((prev) => !prev)}
            searchOpen={searchOpen}
            brandName={brandName}
            brandShortName={brandShortName}
            siteLogoUrl={siteLogoUrl}
            logoHref={logoHref}
            promotionsHref={promotionsHref}
            cartHref={cartHref}
            wishlistHref={wishlistHref}
            userId={userId}
            profileHref={profileHref}
            loginHref={loginHref}
            registerHref={registerHref}
            user={user}
            navSlot={titleBarNavSlot}
            notificationSlot={titleBarNotificationSlot}
            devSlot={titleBarDevSlot}
            promoStripText={titleBarPromoStripText}
            isDark={theme === "dark"}
            onToggleTheme={showThemeToggle ? toggleTheme : undefined}
            onTourStart={onTourStart}
            onBeforeToggleDashboardNav={handleBeforeDashboardNavToggle}
            suppressDashboardNav={suppressDashboardNav}
            hideSidebarToggle={hideSidebarToggle}
          />
          <NavbarWithSettings navItems={navItems} hiddenNavItems={hiddenNavItems} permissions={authUser?.permissions} />
          {searchOpen && (searchSlotRenderer ? searchSlotRenderer(() => setSearchOpen(false)) : searchSlot)}
          {/* Inside the observed sticky wrapper so any future banner content's
              height is automatically included in --header-height — a banner
              rendered outside this wrapper would silently desync any
              StickyToolbar offset="header" beneath it (same bug class as the
              bottom-nav overlap this session fixed). */}
          {eventBannerSlot}
        </Div>

        <AutoBreadcrumbs />

        <Div layout="flex" className="relative w-full flex-1 overflow-x-clip">
          <SidebarLayout
            isOpen={sidebarOpen}
            ariaLabel="Secondary navigation"
            header={
              user ? (
                <SidebarUserHeader user={user} onClose={() => setSidebarOpen(false)} />
              ) : (
                <SidebarGuestHeader sidebarTitle={sidebarTitle} onClose={() => setSidebarOpen(false)} />
              )
            }
            onClose={() => setSidebarOpen(false)}
          >
            {sidebarContent}
          </SidebarLayout>

          <Main
            id="main-content"
            // No bottom-chrome clearance here on purpose. FooterLayout is a
            // SIBLING rendered after <Main>, so a margin here only gaps
            // main-to-footer — it never clears the bottom of the page, which is
            // what the fixed nav + tier actually overlap. That reservation now
            // lives on the footer's own padding-bottom.
            className="w-full flex-1 flex flex-col"
          >
            <Div padding="y-lg" className={`flex-1 ${contentClassName ?? "mx-auto w-full max-w-screen-xl px-[var(--appkit-space-5)] md:px-[var(--appkit-space-6)] lg:px-[var(--appkit-space-8)]"}`}>
              {children}
            </Div>
          </Main>
        </Div>

        <BackToTop />
        <FooterLayout {...footer} />
        <BottomChrome>
          <BottomActions />
        </BottomChrome>
        {showBottomNav && (
          <BottomNavbar
            user={user}
            userId={userId}
            homeHref={homeHref}
            shopHref={shopHref}
            cartHref={cartHref}
            wishlistHref={wishlistHref}
            profileHref={profileHref}
            loginHref={loginHref}
            onSearchToggle={() => setSearchOpen((prev) => !prev)}
            navItems={navItems}
            onMoreToggle={hasDashboardNav ? toggleDashboardNav : handleTogglePublicSidebar}
          />
        )}
        <UnsavedChangesModal />
      </Stack>
    </>
  );
}
