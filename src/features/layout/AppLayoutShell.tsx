"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Main,
  Div,
  Text,
  TextLink,
  Ul,
  Li,
  AvatarDisplay,
  BackgroundRenderer,
  UnsavedChangesModal,
} from "../../ui";

const ROLE_DOT_COLORS: Record<string, string> = {
  admin: "#9333ea",
  moderator: "#0ea5e9",
  seller: "#0d9488",
  employee: "#f59e0b",
};
import { useTheme } from "../../react";
import { useAuth } from "../../react/contexts/SessionContext";
import { NavbarWithSettings } from "./NavbarWithSettings";
import { useBottomActionsContext } from "./BottomActionsContext";
import BottomActions from "./BottomActions";
import { AutoBreadcrumbs } from "./AutoBreadcrumbs";
import { BottomNavbar, type BottomNavbarUser } from "./BottomNavbar";
import { FooterLayout, type FooterLayoutProps } from "./FooterLayout";
import { MainNavbar, type MainNavbarItem } from "./MainNavbar";
import { SidebarLayout } from "./SidebarLayout";
import { TitleBar } from "./TitleBar";
import { BackToTop } from "./BackToTop";
import { useDashboardNav } from "./DashboardNavContext";

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

const DEFAULT_LIGHT_BG = {
  type: "color" as const,
  value: "#f9fafb",
  overlay: { enabled: false, color: "#000000", opacity: 0 },
};

const CLS_STAT_BOX = "flex flex-col items-center gap-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-center";
const CLS_STAT_LABEL = "text-xs text-zinc-500 dark:text-zinc-400";

const DEFAULT_DARK_BG = {
  type: "color" as const,
  value: "#030712",
  overlay: { enabled: false, color: "#000000", opacity: 0 },
};

/** Collapsible accordion section for the public sidebar. */
function CollapsibleNavGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <Div className="space-y-0.5">{children}</Div>}
    </Div>
  );
}

function CollapsibleSidebarSection({
  section,
  navItemClass,
}: {
  section: AppLayoutShellSidebarSection;
  navItemClass: string;
}) {
  const [open, setOpen] = useState(section.defaultOpen ?? false);
  const hasTitle = !!section.title;

  if (!hasTitle) {
    return (
      <Ul className="space-y-0.5">
        {section.items.map((item) => (
          <Li key={`${item.href}-${item.label}`}>
            <TextLink href={item.href} variant="none" className={navItemClass}>
              {item.icon && (
                <span className="flex-shrink-0 w-5 text-center" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </TextLink>
          </Li>
        ))}
      </Ul>
    );
  }

  return (
    <Div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <span>{section.title}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <Ul className="space-y-0.5">
          {section.items.map((item) => (
            <Li key={`${item.href}-${item.label}`}>
              <TextLink href={item.href} variant="none" className={navItemClass}>
                {item.icon && (
                  <span className="flex-shrink-0 w-5 text-center" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </TextLink>
            </Li>
          ))}
        </Ul>
      )}
    </Div>
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
    <Div className="flex items-center justify-between gap-3">
      <Div className="flex items-center gap-3 flex-1 min-w-0">
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
          {user.role && user.role !== "user" && (
            <Div
              className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 text-white text-[9px] font-bold leading-none select-none"
              style={{ background: ROLE_DOT_COLORS[user.role] ?? "#6b7280" }}
              title={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              aria-label={user.role}
            >
              {user.role.charAt(0).toUpperCase()}
            </Div>
          )}
        </Div>
        <Div className="flex-1 min-w-0">
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {user.displayName || "User"}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {user.email || ""}
          </Text>
        </Div>
      </Div>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="flex-shrink-0 rounded-full p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-zinc-100 transition-all hover:rotate-90"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Div>
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
    <Div className="flex items-center justify-between">
      <Div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{sidebarTitle}</Div>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-zinc-100 transition-all hover:rotate-90"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Div>
  );
}

// ─── SidebarContent sub-component ─────────────────────────────────────────────

interface SidebarContentProps {
  sidebarItems: AppLayoutShellSidebarLink[];
  sidebarSections?: AppLayoutShellSidebarSection[];
  sidebarPrimaryActions?: Array<{ href: string; label: string; variant?: "primary" | "outline" }>;
  user?: BottomNavbarUser | null;
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
  toggleTheme: () => void;
  onLogout?: () => void;
  onAfterLogout: () => void;
}

function SidebarContent({
  sidebarItems,
  sidebarSections,
  sidebarPrimaryActions,
  user,
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
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-primary-50 hover:text-primary-800 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-secondary-300";

  const normalizedSections: AppLayoutShellSidebarSection[] = hasSections
    ? (sidebarSections as AppLayoutShellSidebarSection[])
    : hasLegacyItems
      ? [{ items: sidebarItems }]
      : [];

  return (
    <Div className="space-y-6">
      {!isAuthenticated && sidebarPrimaryActions && sidebarPrimaryActions.length > 0 && (
        <Div className="space-y-2">
          {sidebarPrimaryActions.map((action) => (
            <TextLink
              key={`${action.href}-${action.label}`}
              href={action.href}
              variant="none"
              className={[
                "block w-full rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm",
                action.variant === "outline"
                  ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:text-zinc-100 dark:hover:bg-slate-800"
                  : "bg-primary text-white hover:bg-primary-600 dark:bg-primary dark:hover:bg-primary-600 btn-glow",
              ].join(" ")}
            >
              {action.label}
            </TextLink>
          ))}
        </Div>
      )}

      {isAuthenticated && (
        <CollapsibleNavGroup title={labels.sectionTitle}>
          <Ul className="space-y-0.5">
            <Li>
              <TextLink href={profileHref} variant="none" className={navItemClass}>{labels.profile}</TextLink>
            </Li>
            {userOrdersHref && (
              <Li><TextLink href={userOrdersHref} variant="none" className={navItemClass}>{labels.orders}</TextLink></Li>
            )}
            {userWishlistHref && (
              <Li><TextLink href={userWishlistHref} variant="none" className={navItemClass}>{labels.wishlist}</TextLink></Li>
            )}
            {userSettingsHref && (
              <Li><TextLink href={userSettingsHref} variant="none" className={navItemClass}>{labels.settings}</TextLink></Li>
            )}
          </Ul>
        </CollapsibleNavGroup>
      )}

      {isAuthenticated && user?.stats && (
        <Div className="grid grid-cols-2 gap-2">
          {user.stats.totalOrders != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user.stats.totalOrders}</Text>
              <Text className={CLS_STAT_LABEL}>Orders</Text>
            </Div>
          )}
          {user.stats.reviewsCount != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user.stats.reviewsCount}</Text>
              <Text className={CLS_STAT_LABEL}>Reviews</Text>
            </Div>
          )}
          {user.stats.auctionsWon != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user.stats.auctionsWon}</Text>
              <Text className={CLS_STAT_LABEL}>Auctions Won</Text>
            </Div>
          )}
          {user.stats.itemsSold != null && (
            <Div className={CLS_STAT_BOX}>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user.stats.itemsSold}</Text>
              <Text className={CLS_STAT_LABEL}>Items Sold</Text>
            </Div>
          )}
        </Div>
      )}

      {isAuthenticated && isAdminOrSeller && (adminHref || resolvedStoreHref) && (
        <CollapsibleNavGroup title={labels.dashboardSectionTitle}>
          <Ul className="space-y-0.5">
            {adminHref && role === "admin" && (
              <Li>
                <TextLink href={adminHref} variant="none" className={navItemClass}>{labels.adminDashboard}</TextLink>
              </Li>
            )}
            {resolvedStoreHref && isAdminOrSeller && (
              <Li>
                <TextLink href={resolvedStoreHref} variant="none" className={navItemClass}>{labels.storeDashboard}</TextLink>
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
        />
      ))}

      {(sidebarLocaleSlot || showThemeToggleInSidebar || (isAuthenticated && onLogout)) && (
        <Div className="border-t border-zinc-200 pt-4 space-y-3 dark:border-slate-800">
          {sidebarLocaleSlot}
          {showThemeToggleInSidebar && (
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-primary-50 hover:text-primary-800 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-secondary-300"
            >
              <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          )}
          {isAuthenticated && onLogout && (
            <button
              type="button"
              onClick={() => { onLogout(); onAfterLogout(); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            >
              {labels.logout}
            </button>
          )}
        </Div>
      )}
    </Div>
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
  contentClassName,
  lightBackground = DEFAULT_LIGHT_BG,
  darkBackground = DEFAULT_DARK_BG,
}: AppLayoutShellProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { closeNav: closeDashboardNav, hasNav: hasDashboardNav, toggleNav: toggleDashboardNav } = useDashboardNav();
  const { state: bottomActionsState } = useBottomActionsContext();
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

  const hasBottomActions =
    bottomActionsState.actions.length > 0 ||
    !!(bottomActionsState.bulk && bottomActionsState.bulk.selectedCount > 0) ||
    !!bottomActionsState.infoLabel;

  const sidebarContent = (
    <SidebarContent
      sidebarItems={sidebarItems}
      sidebarSections={sidebarSections}
      sidebarPrimaryActions={sidebarPrimaryActions}
      user={user}
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
      color: lightBackground.overlay?.color ?? "#000000",
      opacity: lightBackground.overlay?.opacity ?? 0,
    },
  };

  const normalizedDarkBackground = {
    type: darkBackground.type,
    value: darkBackground.value,
    overlay: {
      enabled: darkBackground.overlay?.enabled ?? false,
      color: darkBackground.overlay?.color ?? "#000000",
      opacity: darkBackground.overlay?.opacity ?? 0,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Div className="flex min-h-screen w-full flex-col overflow-x-clip transition-colors duration-300">
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
            onBeforeToggleDashboardNav={handleBeforeDashboardNavToggle}
            suppressDashboardNav={suppressDashboardNav}
            hideSidebarToggle={hideSidebarToggle}
          />
          <NavbarWithSettings navItems={navItems} hiddenNavItems={hiddenNavItems} permissions={authUser?.permissions} />
          {searchOpen && (searchSlotRenderer ? searchSlotRenderer(() => setSearchOpen(false)) : searchSlot)}
        </Div>

        {eventBannerSlot}

        <AutoBreadcrumbs />

        <Div className="relative flex w-full flex-1 overflow-x-clip">
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
            className={`w-full flex-1 ${hasBottomActions ? "mb-28" : "mb-16"} md:mb-0`}
          >
            <Div className={contentClassName ?? "w-full px-4 py-6 md:px-6 lg:px-8"}>
              {children}
            </Div>
          </Main>
        </Div>

        <BackToTop />
        <FooterLayout {...footer} />
        <BottomActions />
        <BottomNavbar
          user={user}
          homeHref={homeHref}
          shopHref={shopHref}
          cartHref={cartHref}
          profileHref={profileHref}
          loginHref={loginHref}
          onSearchToggle={() => setSearchOpen((prev) => !prev)}
          navItems={navItems}
          onMoreToggle={hasDashboardNav ? toggleDashboardNav : handleTogglePublicSidebar}
        />
        <UnsavedChangesModal />
      </Div>
    </QueryClientProvider>
  );
}
