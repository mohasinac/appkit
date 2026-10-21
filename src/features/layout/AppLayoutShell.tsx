"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
// QueryClientProvider intentionally NOT imported here. Consumer's QueryProvider
// owns the singleton; nesting another would risk Turbopack chunk-splitting.
// The actual 2.8.8 SSR crash was a peer-dep duplicate fixed by the
// scripts/dedupe-peer-deps.mjs postinstall hook (see scripts/ and CLAUDE.md #19).
import { ChevronDown } from "lucide-react";
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
import SideActionDock from "./SideActionDock";
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
import { TOP_BANNER_SLOT_ID } from "../../ui/components/top-banner-slot";
import { usePathname } from "next/navigation";
import { findActiveNavItem } from "../../_internal/client/features/layout/navActive";

/** A single sidebar link. */
export interface AppLayoutShellSidebarLink {
  href: string;
  label: string;
  /** Optional icon rendered before the label (emoji string or ReactNode). */
  icon?: React.ReactNode;
  /**
   * Sub-links, rendered indented beneath this one.
   *
   * 🛑 This mirrors the top navbar's dropdown, and it exists for the same
   * reason the navbar's does: the sidebar and the mobile sheet are built from
   * the SAME nav items, so a parent that gained children in the navbar would
   * otherwise silently lose every one of them here — the merge would read as a
   * deletion on exactly the surface phones use. One level only, matching
   * `NavbarLayoutItem`.
   */
  children?: AppLayoutShellSidebarLink[];
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
  /** D9 — chat. Absent entirely when `siteSettings.chat.enabled !== true`; the consumer decides, this shell only forwards. */
  messagesHref?: string;
  unreadMessageCount?: number;
  /** Auth UID passed through to TitleBar for wishlist merge-on-login and sync. */
  userId?: string | null;
  profileHref: string;
  loginHref: string;
  registerHref?: string;
  homeHref: string;
  shopHref: string;
  footer: FooterLayoutProps;
  /**
   * Render the public marketing footer. Defaults to `true`.
   *
   * Pass `false` on a dashboard. `footer` stays REQUIRED either way, so the
   * consumer keeps one code path and there is no "which half did I forget"
   * state — this only decides whether it is shown.
   *
   * 🛑 It also moves the bottom-chrome reservation: the footer owns it when
   * rendered, `<Main>` owns it when not. See the comment on `<Main>`.
   */
  showFooter?: boolean;
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

/**
 * Flatten a sidebar section's links for active-item resolution.
 *
 * 🛑 Children MUST be in here. `findActiveNavItem` picks the longest prefix
 * match, so leaving them out means a page that is only reachable as a child —
 * /auctions under "Products" — marks nothing at all, the same lost-your-place
 * bug the navbar's own comment documents.
 */
function flattenSidebarLinks(
  items: AppLayoutShellSidebarLink[],
): AppLayoutShellSidebarLink[] {
  return items.flatMap((item) => [item, ...(item.children ?? [])]);
}

/**
 * A sidebar link that owns sub-links: FIRST tap expands, SECOND tap follows.
 *
 * 🛑 The second tap is what keeps this a link rather than a folder. A parent
 * that only ever toggles makes its own page unreachable from the sidebar — the
 * catalogue index would be the one shop page you could not open from the menu
 * that lists the shop. So the destination is the parent's own href, falling
 * back to its first child when the parent is a grouping with no page of its
 * own, and `preventDefault` applies only on the expanding tap.
 *
 * It differs from the navbar on purpose: there, hover already reveals the menu,
 * so a click can navigate immediately. A sidebar has no hover, and a thumb has
 * no caret small enough to aim at reliably — the tap has to do both jobs, in
 * order.
 */
function SidebarParentLink({
  item,
  activeItem,
  activeHref,
  navItemClass,
  navItemActiveClass,
}: {
  item: AppLayoutShellSidebarLink;
  activeItem: AppLayoutShellSidebarLink | undefined;
  activeHref: string;
  navItemClass: string;
  navItemActiveClass: string;
}) {
  const children = item.children ?? [];
  const containsActive =
    !!activeItem && children.some((child) => child.href === activeItem.href);
  const [expanded, setExpanded] = useState(containsActive);

  // The sidebar stays mounted across client-side navigation, so the lazy
  // initial state above only ever fires once — re-open when the route moves
  // into this group.
  useEffect(() => {
    if (containsActive) setExpanded(true);
  }, [containsActive]);

  const isActive = activeItem?.href === item.href;
  const target = item.href || children[0]?.href || "#";

  return (
    <Li>
      <TextLink
        href={target}
        variant="none"
        className={isActive ? navItemActiveClass : navItemClass}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={expanded}
        onClick={(e: React.MouseEvent) => {
          if (expanded) return;
          e.preventDefault();
          setExpanded(true);
        }}
      >
        {item.icon && (
          <Span className="flex-shrink-0 w-5 text-center" aria-hidden="true">
            {item.icon}
          </Span>
        )}
        {item.label}
        <ChevronDown
          className={`ms-auto w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </TextLink>
      {expanded && (
        <SidebarSectionLinks
          items={children}
          activeHref={activeHref}
          activeItem={activeItem}
          navItemClass={navItemClass}
          navItemActiveClass={navItemActiveClass}
          nested
        />
      )}
    </Li>
  );
}

/** One sidebar link plus its indented sub-links. */
function SidebarSectionLinks({
  items,
  activeHref,
  activeItem,
  navItemClass,
  navItemActiveClass,
  nested = false,
}: {
  items: AppLayoutShellSidebarLink[];
  activeHref: string;
  activeItem: AppLayoutShellSidebarLink | undefined;
  navItemClass: string;
  navItemActiveClass: string;
  nested?: boolean;
}) {
  return (
    <Ul spacing="2xs" className={nested ? "ps-[var(--appkit-space-6)]" : undefined}>
      {items.map((item) => {
        const isActive = activeItem?.href === item.href;
        if (item.children && item.children.length > 0) {
          return (
            <SidebarParentLink
              key={`${item.href}-${item.label}`}
              item={item}
              activeItem={activeItem}
              activeHref={activeHref}
              navItemClass={navItemClass}
              navItemActiveClass={navItemActiveClass}
            />
          );
        }
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
  const activeItem = findActiveNavItem(flattenSidebarLinks(section.items), activeHref);
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
      <SidebarSectionLinks
        items={section.items}
        activeHref={activeHref}
        activeItem={activeItem}
        navItemClass={navItemClass}
        navItemActiveClass={navItemActiveClass}
      />
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
        <SidebarSectionLinks
          items={section.items}
          activeHref={activeHref}
          activeItem={activeItem}
          navItemClass={navItemClass}
          navItemActiveClass={navItemActiveClass}
        />
      )}
    </Stack>
  );
}

/** Sidebar header when a user is logged in — avatar + display name + close button. */
function SidebarUserHeader({
  user,
  onClose,
  profileHref,
}: {
  user: BottomNavbarUser;
  onClose: () => void;
  /**
   * Where the avatar goes. Optional so an existing caller that has no profile
   * route still renders the header — the avatar simply stays inert there
   * rather than linking somewhere that does not exist.
   */
  profileHref?: string;
}) {
  return (
    <Row align="center" justify="between" gap="3">
      <Row className="flex-1 min-w-0" align="center" gap="3">
        {/*
          * The avatar links to the profile, and CLOSES the sidebar on the way.
          * Without `onClose` the panel stays open over the page it just
          * navigated to, which reads as the tap having done nothing.
          */}
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
          {/*
            * The link is an OVERLAY rather than a wrapper around the avatar.
            * Wrapping would put the role badge — which is `absolute` against
            * this same box — inside the anchor, so the badge would become part
            * of the link's hit area and its own `title` would fight the link's
            * accessible name. An inset overlay keeps the badge decorative and
            * gives the whole avatar one clean target.
            */}
          {profileHref && (
            <TextLink
              href={profileHref}
              variant="none"
              onClick={onClose}
              className="absolute inset-0 rounded-full"
            >
              {/* `TextLink` requires children, and a visually-hidden label is
                  a better accessible name than a bare `aria-label` — it stays
                  translatable and survives a screen reader that prefers
                  content over attributes. */}
              <Span className="sr-only">View your profile</Span>
            </TextLink>
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
        className="flex-shrink-0 rounded-full p-[var(--appkit-space-2)] hover:bg-surface-hover hover:text-zinc-900 text-[var(--appkit-color-text-muted)] dark:hover:text-zinc-100 transition-all hover:rotate-90"
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
        className="rounded-full p-[var(--appkit-space-2)] hover:bg-surface-hover hover:text-zinc-900 text-[var(--appkit-color-text-muted)] dark:hover:text-zinc-100 transition-all hover:rotate-90"
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

      {/*
        * Each stat LINKS to the list it counts.
        *
        * 🛑 These were four inert `<Div>`s — a number the user could see and
        * could not act on, which is Root Cause #56's shape at a smaller scale
        * ("a row that only offers mutations is not done"). Nothing new had to
        * be threaded in: `userOrdersHref`, `profileHref` and
        * `resolvedStoreHref` were already props on this component, and the
        * Orders stat sat thirty lines below a nav link using the very href it
        * was missing.
        *
        * "Auctions Won" deep-links to the orders list filtered to the auction
        * LANE — not to `/user/bids`, which is open bids rather than won
        * orders. That filter is the `orderType` tab in `UserOrdersView`, so
        * the two surfaces agree by construction.
        *
        * "Items Sold" renders only when the viewer actually has a store;
        * otherwise it is a number with nowhere to go.
        */}
      {isAuthenticated && user?.stats && (
        <Div layout="grid" gap="2" className="grid-cols-2">
          {user.stats.totalOrders != null && userOrdersHref && (
            <TextLink href={userOrdersHref} variant="none" className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.totalOrders}</Text>
              <Text className={CLS_STAT_LABEL}>Orders</Text>
            </TextLink>
          )}
          {user.stats.reviewsCount != null && (
            <TextLink href={`${profileHref}#reviews`} variant="none" className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.reviewsCount}</Text>
              <Text className={CLS_STAT_LABEL}>Reviews</Text>
            </TextLink>
          )}
          {user.stats.auctionsWon != null && userOrdersHref && (
            <TextLink href={`${userOrdersHref}?orderType=auction`} variant="none" className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.auctionsWon}</Text>
              <Text className={CLS_STAT_LABEL}>Auctions Won</Text>
            </TextLink>
          )}
          {user.stats.itemsSold != null && resolvedStoreHref && (
            <TextLink href={resolvedStoreHref} variant="none" className={CLS_STAT_BOX}>
              <Text className="leading-none" color="primary" size="lg" weight="bold">{user.stats.itemsSold}</Text>
              <Text className={CLS_STAT_LABEL}>Items Sold</Text>
            </TextLink>
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
              className="flex w-full items-center justify-end gap-[var(--appkit-space-3)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text-muted)] transition-colors hover:bg-primary-surface hover:text-primary-800 dark:hover:text-primary-200"
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
  messagesHref,
  unreadMessageCount,
  userId,
  profileHref,
  loginHref,
  registerHref,
  homeHref,
  shopHref,
  footer,
  showFooter = true,
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
  const { closeNav: closeDashboardNav } = useDashboardNav();
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

        {/* The page's topmost band — see `top-banner-slot.ts`.
            🛑 OUTSIDE the sticky wrapper on purpose: anything inside `headerRef`
            is measured into `--header-height`, so a dismissible banner in there
            would make every `StickyToolbar offset="header"` on the page jump the
            moment it was closed. Out here it simply scrolls away. */}
        <Div id={TOP_BANNER_SLOT_ID} className="w-full" />

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
            messagesHref={messagesHref}
            unreadMessageCount={unreadMessageCount}
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
                <SidebarUserHeader
                  user={user}
                  onClose={() => setSidebarOpen(false)}
                  profileHref={profileHref}
                />
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
            // Bottom-chrome clearance belongs to whichever element is LAST.
            //
            // With the footer rendered it is the footer's, and a margin here
            // would only gap main-to-footer — it would never clear the bottom
            // of the page, which is what the fixed nav + tier actually
            // overlap. That is why this carried no bottom padding.
            //
            // With the footer SUPPRESSED (`showFooter={false}`, which is every
            // dashboard page) `<Main>` becomes the last element, so the same
            // reasoning puts the reservation here instead. Exactly one of the
            // two owns it at a time; both would add a screen of dead space.
            //
            // The TOP tier is the mirror image and does belong here: at `lg` the
            // chrome tier hangs under the header as a fixed bar, so without this
            // it would cover the first rows of the page. `--top-chrome-height`
            // is 0 below `lg` and 0 whenever no bar is published, so this
            // reserves exactly nothing until there is something to reserve —
            // which is why it can be unconditional rather than route-gated.
            className={[
              "w-full flex-1 flex flex-col pt-[var(--top-chrome-height,0px)] transition-[padding-top] duration-300 ease-out",
              showFooter
                ? ""
                : "pb-[calc(var(--bottom-nav-height,4rem)+var(--bottom-chrome-height,0px))]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/*
              🛑 THE VERTICAL PADDING IS CONDITIONAL, AND RESTORING THAT IS A
              BUG FIX RATHER THAN A TWEAK.

              `contentClassName`'s own docstring says it "replaces the default
              `w-full px-4 py-6`" and to pass `"w-full"` for dashboards, which
              "provide their own padding via DashboardLayoutClient". That was
              true while the padding lived in the className. It later moved to
              a `padding` PROP — outside the swap — so it stopped being
              replaceable and every dashboard page paid BOTH: 24px here and 32px
              from `DashboardLayoutClient`'s `py-[space-8]`, i.e. 56px of
              stacked padding from two components that each believed it owned
              the spacing.

              A caller that overrides the content className owns the padding
              outright, which is what the prop always claimed. Public pages
              (no override) are unchanged.
            */}
            <Div padding={contentClassName ? "none" : "y-lg"} className={`flex-1 ${contentClassName ?? "mx-auto w-full max-w-screen-xl px-[var(--appkit-space-5)] md:px-[var(--appkit-space-6)] lg:px-[var(--appkit-space-8)]"}`}>
              {children}
            </Div>
          </Main>
        </Div>

        <BackToTop />
        {/*
          🛑 THE 86-LINK MARKETING FOOTER WAS UNDER EVERY DASHBOARD PAGE.

          `<FooterLayout>` rendered unconditionally, so `/admin/products`
          ended in "Shop by Category", a newsletter form, social links and the
          full legal block — on both viewports. A dashboard is a different
          surface from the shop, and nothing in that footer is reachable only
          from there: the dashboard sidebar carries its own nav and
          `SIDEBAR_SUPPORT_LINKS`, and the title bar carries the account menu.

          Suppressed by the consumer rather than route-sniffed here. This
          component is handed its chrome; deciding what a path means is the
          consumer's job, and `LayoutShellClient` already computes
          `isDashboard` for exactly this kind of question.

          🛑 The NAVBAR is deliberately still unconditional. It carries search,
          cart and the account menu, so dropping it needs the Phase 3a role
          title bar to exist first — otherwise a dashboard loses its only path
          back to the shop. That is the remaining half of the audit's "two
          navigation systems at once".
        */}
        {showFooter && <FooterLayout {...footer} />}
        {/*
          The page-action control is ONE context with TWO presentations, and
          exactly one of them is mounted at any width (`useIsDesktop`):

            < lg   <BottomActions/>  — a bar in the thumb zone, INSIDE the tier
                                        so it stacks above the tab bar and its
                                        height reaches --bottom-chrome-height.
            >= lg  <SideActionDock/> — a floating puck at the vertical middle,
                                        OUTSIDE the tier: it reserves no height,
                                        and putting it in would push the footer
                                        down by a bar that is a 56px button most
                                        of the time.

          🛑 `<BottomChrome>` is not optional even when the bar inside it is
          absent. It is the tier container `ListingLayout`'s mobile pagination
          bar portals into, and the sole publisher of `--bottom-chrome-height`,
          which the footer's clearance and `BackToTop` both read.
        */}
        <BottomChrome>
          <BottomActions />
        </BottomChrome>
        <SideActionDock />
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
            onMoreToggle={handleTogglePublicSidebar}
          />
        )}
        <UnsavedChangesModal />
      </Stack>
    </>
  );
}
