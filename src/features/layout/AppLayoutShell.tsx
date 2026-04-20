"use client";

import React, { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Main,
  Div,
  Text,
  TextLink,
  Ul,
  Li,
  AvatarDisplay,
  RoleBadge,
  BackgroundRenderer,
  UnsavedChangesModal,
} from "../../ui";
import { useTheme } from "../../react";
import { useBottomActionsContext } from "./BottomActionsContext";
import BottomActions from "./BottomActions";
import { AutoBreadcrumbs } from "./AutoBreadcrumbs";
import { BottomNavbar, type BottomNavbarUser } from "./BottomNavbar";
import { FooterLayout, type FooterLayoutProps } from "./FooterLayout";
import { MainNavbar, type MainNavbarItem } from "./MainNavbar";
import { SidebarLayout } from "./SidebarLayout";
import { TitleBar } from "./TitleBar";
import { BackToTop } from "./BackToTop";

export interface AppLayoutShellSidebarLink {
  href: string;
  label: string;
}

export interface AppLayoutShellSidebarSection {
  title?: string;
  items: AppLayoutShellSidebarLink[];
}

export interface AppLayoutShellSidebarAction {
  href: string;
  label: string;
  variant?: "solid" | "outline";
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
  logoHref: string;
  promotionsHref?: string;
  cartHref: string;
  profileHref: string;
  loginHref: string;
  homeHref: string;
  shopHref: string;
  footer: FooterLayoutProps;
  searchSlot?: React.ReactNode;
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
  /** Href for the seller dashboard — shown in sidebar Dashboard section when user.role is admin or seller. */
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
    sellerDashboard?: string;
    logout?: string;
  };
  eventBannerSlot?: React.ReactNode;
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

const DEFAULT_DARK_BG = {
  type: "color" as const,
  value: "#030712",
  overlay: { enabled: false, color: "#000000", opacity: 0 },
};

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
  logoHref,
  promotionsHref,
  cartHref,
  profileHref,
  loginHref,
  homeHref,
  shopHref,
  footer,
  searchSlot,
  titleBarNavSlot,
  titleBarNotificationSlot,
  titleBarDevSlot,
  titleBarPromoStripText,
  showThemeToggle = false,
  suppressDashboardNav = false,
  hideSidebarToggle = false,
  onLogout,
  adminHref,
  sellerHref,
  userOrdersHref,
  userWishlistHref,
  userSettingsHref,
  sidebarLocaleSlot,
  showThemeToggleInSidebar = false,
  sidebarProfileLabels,
  eventBannerSlot,
  lightBackground = DEFAULT_LIGHT_BG,
  darkBackground = DEFAULT_DARK_BG,
}: AppLayoutShellProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { state: bottomActionsState } = useBottomActionsContext();

  const hasBottomActions =
    bottomActionsState.actions.length > 0 ||
    !!(bottomActionsState.bulk && bottomActionsState.bulk.selectedCount > 0) ||
    !!bottomActionsState.infoLabel;

  const sidebarContent = useMemo(() => {
    const hasLegacyItems = sidebarItems.length > 0;
    const hasSections = !!(sidebarSections && sidebarSections.length > 0);
    const isAuthenticated = !!user;
    const role = user?.role ?? "user";
    const isAdminOrSeller = role === "admin" || role === "seller";

    // Labels with defaults
    const labels = {
      sectionTitle: sidebarProfileLabels?.sectionTitle ?? "Profile",
      profile: sidebarProfileLabels?.profile ?? "My Profile",
      orders: sidebarProfileLabels?.orders ?? "My Orders",
      wishlist: sidebarProfileLabels?.wishlist ?? "My Wishlist",
      settings: sidebarProfileLabels?.settings ?? "Settings",
      dashboardSectionTitle:
        sidebarProfileLabels?.dashboardSectionTitle ?? "Dashboard",
      adminDashboard: sidebarProfileLabels?.adminDashboard ?? "Admin Dashboard",
      sellerDashboard:
        sidebarProfileLabels?.sellerDashboard ?? "Seller Dashboard",
      logout: sidebarProfileLabels?.logout ?? "Logout",
    };

    const sectionLabelClass =
      "px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
    const navItemClass =
      "block rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-zinc-50";

    const normalizedSections: AppLayoutShellSidebarSection[] = hasSections
      ? (sidebarSections as AppLayoutShellSidebarSection[])
      : hasLegacyItems
        ? [{ items: sidebarItems }]
        : [];

    return (
      <Div className="space-y-6">
        {/* Auth actions (login/register) when not authenticated */}
        {!isAuthenticated &&
          sidebarPrimaryActions &&
          sidebarPrimaryActions.length > 0 && (
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
                      : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
                  ].join(" ")}
                >
                  {action.label}
                </TextLink>
              ))}
            </Div>
          )}

        {/* PROFILE section — auto-generated when user is authenticated */}
        {isAuthenticated &&
          (profileHref ||
            userOrdersHref ||
            userWishlistHref ||
            userSettingsHref) && (
            <Div className="space-y-1">
              <Text className={sectionLabelClass}>{labels.sectionTitle}</Text>
              <Ul className="space-y-0.5">
                {profileHref && (
                  <Li>
                    <TextLink
                      href={profileHref}
                      variant="none"
                      className={navItemClass}
                    >
                      {labels.profile}
                    </TextLink>
                  </Li>
                )}
                {userOrdersHref && (
                  <Li>
                    <TextLink
                      href={userOrdersHref}
                      variant="none"
                      className={navItemClass}
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
                      className={navItemClass}
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
                      className={navItemClass}
                    >
                      {labels.settings}
                    </TextLink>
                  </Li>
                )}
              </Ul>
            </Div>
          )}

        {/* DASHBOARD section — shown to admin/seller roles */}
        {isAuthenticated && isAdminOrSeller && (adminHref || sellerHref) && (
          <Div className="space-y-1">
            <Text className={sectionLabelClass}>
              {labels.dashboardSectionTitle}
            </Text>
            <Ul className="space-y-0.5">
              {adminHref && role === "admin" && (
                <Li>
                  <TextLink
                    href={adminHref}
                    variant="none"
                    className={navItemClass}
                  >
                    {labels.adminDashboard}
                  </TextLink>
                </Li>
              )}
              {sellerHref && isAdminOrSeller && (
                <Li>
                  <TextLink
                    href={sellerHref}
                    variant="none"
                    className={navItemClass}
                  >
                    {labels.sellerDashboard}
                  </TextLink>
                </Li>
              )}
            </Ul>
          </Div>
        )}

        {/* Consumer-provided sections (Browse, Support, etc.) */}
        {normalizedSections.map((section, sectionIndex) => (
          <Div key={`sidebar-section-${sectionIndex}`} className="space-y-1">
            {section.title ? (
              <Text className={sectionLabelClass}>{section.title}</Text>
            ) : null}
            <Ul className="space-y-0.5">
              {section.items.map((item) => (
                <Li key={`${item.href}-${item.label}`}>
                  <TextLink
                    href={item.href}
                    variant="none"
                    className={navItemClass}
                  >
                    {item.label}
                  </TextLink>
                </Li>
              ))}
            </Ul>
          </Div>
        ))}

        {/* Sidebar footer: locale, theme toggle, logout */}
        {(sidebarLocaleSlot ||
          showThemeToggleInSidebar ||
          (isAuthenticated && onLogout)) && (
          <Div className="border-t border-zinc-200 pt-4 space-y-3 dark:border-slate-800">
            {sidebarLocaleSlot}
            {showThemeToggleInSidebar && (
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-zinc-50"
              >
                <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            )}
            {isAuthenticated && onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              >
                {labels.logout}
              </button>
            )}
          </Div>
        )}
      </Div>
    );
  }, [
    sidebarItems,
    sidebarSections,
    sidebarPrimaryActions,
    user,
    profileHref,
    userOrdersHref,
    userWishlistHref,
    userSettingsHref,
    adminHref,
    sellerHref,
    sidebarLocaleSlot,
    showThemeToggleInSidebar,
    onLogout,
    sidebarProfileLabels,
    theme,
    toggleTheme,
  ]);

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

        <Div className="sticky top-0 z-50 w-full">
          <TitleBar
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            sidebarOpen={sidebarOpen}
            onSearchToggle={() => setSearchOpen((prev) => !prev)}
            searchOpen={searchOpen}
            brandName={brandName}
            brandShortName={brandShortName}
            logoHref={logoHref}
            promotionsHref={promotionsHref}
            cartHref={cartHref}
            profileHref={profileHref}
            user={user}
            navSlot={titleBarNavSlot}
            notificationSlot={titleBarNotificationSlot}
            devSlot={titleBarDevSlot}
            promoStripText={titleBarPromoStripText}
            isDark={theme === "dark"}
            onToggleTheme={showThemeToggle ? toggleTheme : undefined}
            suppressDashboardNav={suppressDashboardNav}
            hideSidebarToggle={hideSidebarToggle}
          />
          <MainNavbar navItems={navItems} hiddenNavItems={hiddenNavItems} />
          {searchOpen && searchSlot}
        </Div>

        {eventBannerSlot}
        <AutoBreadcrumbs />

        <Div className="relative flex w-full flex-1 overflow-x-clip">
          <SidebarLayout
            isOpen={sidebarOpen}
            ariaLabel="Secondary navigation"
            header={
              user ? (
                <Div className="flex items-center justify-between gap-3">
                  <Div className="flex items-center gap-3 flex-1 min-w-0">
                    <Div className="flex-shrink-0">
                      <AvatarDisplay
                        cropData={
                          user.avatarMetadata
                            ? {
                                url: user.avatarMetadata.url,
                                position: user.avatarMetadata.position ?? {
                                  x: 50,
                                  y: 50,
                                },
                                zoom: user.avatarMetadata.zoom ?? 1,
                              }
                            : user.photoURL
                              ? {
                                  url: user.photoURL,
                                  position: { x: 50, y: 50 },
                                  zoom: 1,
                                }
                              : null
                        }
                        size="md"
                        alt={user.displayName || "User"}
                        displayName={user.displayName}
                        email={user.email}
                      />
                    </Div>
                    <Div className="flex-1 min-w-0">
                      <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {user.displayName || "User"}
                      </Text>
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {user.email || ""}
                      </Text>
                    </Div>
                    {user.role && <RoleBadge role={user.role} />}
                  </Div>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setSidebarOpen(false)}
                    className="flex-shrink-0 rounded-full p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-zinc-100 transition-all hover:rotate-90"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </Div>
              ) : (
                <Div className="flex items-center justify-between">
                  <Div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {sidebarTitle}
                  </Div>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-zinc-100 transition-all hover:rotate-90"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </Div>
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
            <Div className="container mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6 lg:px-8">
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
        />
        <UnsavedChangesModal />
      </Div>
    </QueryClientProvider>
  );
}
