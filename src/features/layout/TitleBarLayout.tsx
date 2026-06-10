import Link from "next/link";
import React from "react";
import { Avatar, BlockHeader, Button, Div, Row, SiteLogo, Span } from "../../ui";

/** Minimal user shape required by the title bar. */
export interface TitleBarUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  /** Role string — used for display only. */
  role?: string;
}

export interface TitleBarLayoutProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onSearchToggle: () => void;
  searchOpen: boolean;
  brandName: string;
  brandShortName?: string;
  /** Admin-uploaded site logo URL. Falls back to the SVG wordmark when empty. */
  siteLogoUrl?: string;
  logoHref: string;
  promotionsHref?: string;
  /** Href for the compare page/drawer. When provided, renders a Compare icon button. */
  compareHref?: string;
  wishlistHref?: string;
  wishlistCount?: number;
  cartHref?: string;
  cartCount?: number;
  profileHref?: string;
  /** Unread notification count — shown on the dedicated bell icon only. */
  unreadNotificationCount?: number;
  /**
   * Href for the dedicated notification bell icon rendered to the LEFT of the
   * wishlist icon. When provided, the bell is rendered (with count badge) and
   * navigates to the user notifications page by default.
   */
  notificationsHref?: string;
  loginHref?: string;
  registerHref?: string;
  user?: TitleBarUser | null;
  /** Slot rendered beside the profile link (e.g. NotificationBell). */
  notificationSlot?: React.ReactNode;
  /** Optional dev-only action slot rendered in the right-side action group. */
  devSlot?: React.ReactNode;
  /** Optional nav slot rendered between logo and right action icons (desktop only). */
  navSlot?: React.ReactNode;
  /** When set, renders a dismissable promo micro-strip above the header. */
  promoStripText?: string;
  isDark?: boolean;
  onToggleTheme?: () => void;
  /** Whether a dashboard section has registered a secondary navigation drawer. */
  hasDashboardNav?: boolean;
  /** Callback to toggle the registered dashboard navigation drawer. */
  onToggleDashboardNav?: () => void;
  /** Hide the public sidebar toggle button when nested layouts own navigation. */
  hideSidebarToggle?: boolean;
  id?: string;
  className?: string;
}

/** Shared icon-button class for all action buttons in the title bar. */
const iconBtn =
  "flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-slate-800 dark:hover:text-secondary-400 transition-colors";

/** Badge counter class for wishlist/cart counts. */
const countBadge =
  "absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none";

/**
 * TitleBarLayout — generic top sticky title-bar shell.
 *
 * Layout:
 *  TB1 (h-14, all screens): logo | navSlot? | [secondary actions lg+] | search | deals | theme | hamburger
 *  TB2 (h-10, below lg only): wishlist | cart | profile  — mirrors what TB1 hides below lg
 *
 * Receives all domain data as props — zero domain imports.
 */
export function TitleBarLayout({
  onToggleSidebar,
  sidebarOpen,
  onSearchToggle,
  searchOpen: _searchOpen,
  brandName,
  brandShortName: _brandShortName,
  siteLogoUrl,
  logoHref,
  promotionsHref,
  compareHref,
  wishlistHref,
  wishlistCount = 0,
  cartHref,
  cartCount = 0,
  profileHref,
  unreadNotificationCount = 0,
  notificationsHref,
  loginHref,
  registerHref,
  user,
  notificationSlot,
  devSlot,
  navSlot,
  promoStripText,
  isDark = false,
  onToggleTheme,
  hasDashboardNav: _hasDashboardNav,
  onToggleDashboardNav: _onToggleDashboardNav,
  hideSidebarToggle = false,
  id = "titlebar",
  className = "",
}: TitleBarLayoutProps) {
  // ── Element builders ────────────────────────────────────────────────────────

  const promotionsEl = promotionsHref ? (
    <Link
      href={promotionsHref}
      aria-label="Today's deals"
      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700 dark:bg-secondary-900/40 dark:text-secondary-400 hover:bg-primary-200 dark:hover:bg-secondary-900/60 transition-colors border border-primary-200/60 dark:border-secondary-700/40"
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.37.86.58 1.41.58.55 0 1.05-.21 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
      </svg>
      <Span className="hidden sm:inline">Today&apos;s Deals</Span>
    </Link>
  ) : null;

  const themeBtn = onToggleTheme ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggleTheme}
      className={iconBtn}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.73 0-.71-.71M6.34 6.34l-.71-.71M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z" />
        </svg>
      )}
    </Button>
  ) : null;

  const hamburgerBtn = !hideSidebarToggle ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      aria-expanded={sidebarOpen}
      aria-controls="secondary-sidebar"
      onClick={onToggleSidebar}
      className={iconBtn}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        {sidebarOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </Button>
  ) : null;

  // Compare is always lg+ (desktop-only feature, less critical on mobile)
  const compareEl = compareHref ? (
    <Link
      href={compareHref}
      aria-label="Compare items"
      className={`${iconBtn} hidden lg:flex`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </Link>
  ) : null;

  const searchBtn = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Search"
      onClick={onSearchToggle}
      className={iconBtn}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    </Button>
  );

  // Dedicated notification bell — rendered immediately before the wishlist
  // icon (per layout request). Falls back to invisible when no href is set;
  // the count badge mirrors the wishlist/cart pattern.
  const notificationsEl = notificationsHref ? (
    <Link
      href={notificationsHref}
      aria-label={`Notifications${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} unread` : ""}`}
      className={`relative ${iconBtn}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      {unreadNotificationCount > 0 && (
        <Span className={countBadge}>
          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
        </Span>
      )}
    </Link>
  ) : null;

  const wishlistEl = wishlistHref ? (
    <Link
      href={wishlistHref}
      aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
      className={`relative ${iconBtn}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
      </svg>
      {wishlistCount > 0 && (
        <Span className={countBadge}>{wishlistCount > 9 ? "9+" : wishlistCount}</Span>
      )}
    </Link>
  ) : null;

  const cartEl = cartHref ? (
    <Link
      href={cartHref}
      aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
      className={`relative ${iconBtn}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
      </svg>
      {cartCount > 0 && (
        <Span className={countBadge}>{cartCount > 9 ? "9+" : cartCount}</Span>
      )}
    </Link>
  ) : null;

  const profileEl = profileHref ? (
    <Link
      href={profileHref}
      aria-label={user ? `Profile — ${user.displayName ?? user.email}` : "Sign in"}
      className={`relative ${iconBtn}`}
    >
      <Avatar
        src={user?.photoURL ?? undefined}
        name={user?.displayName ?? user?.email ?? undefined}
        alt={user?.displayName ?? "Profile"}
        size="sm"
      />
    </Link>
  ) : null;

  const authButtonsEl = !user && (loginHref || registerHref) ? (
    <Row gap="xs" className="hidden lg:flex">
      {loginHref && (
        <Link
          href={loginHref}
          className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-primary-700 dark:hover:text-secondary-400 transition-colors rounded-lg hover:bg-primary-50 dark:hover:bg-slate-800"
        >
          Sign in
        </Link>
      )}
      {registerHref && (
        <Link
          href={registerHref}
          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors btn-glow shadow-sm"
        >
          Register
        </Link>
      )}
    </Row>
  ) : null;

  const hasTb2 = !!(notificationsEl || wishlistEl || cartEl || profileEl);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <BlockHeader
      id={id}
      className={`sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-zinc-100 dark:border-slate-800 shadow-sm ${className}`}
    >
      {/* Promo strip */}
      {promoStripText && (
        <Div className="bg-gradient-to-r from-primary-700 to-secondary-600 dark:from-primary-700 dark:to-cobalt-700 text-white text-xs py-1 text-center font-medium">
          {promoStripText}
        </Div>
      )}

      <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
        {/* TB1 — primary row, always visible */}
        <Row justify="between" gap="none" className="relative h-14">
          {/* Left: #1 — wordmark, always shown */}
          <Row gap="3">
            <Link
              href={logoHref}
              aria-label={brandName}
              className="flex items-center transition-opacity hover:opacity-80"
            >
              <SiteLogo title={brandName} className="h-7 md:h-9 lg:h-10" />
            </Link>
          </Row>

          {/* Centre: #2 — admin logo image (absolutely centred when present),
              or nav slot (desktop only) when no logo image is configured */}
          {siteLogoUrl ? (
            <Div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
              <Link
                href={logoHref}
                aria-label={brandName}
                className="flex items-center transition-opacity hover:opacity-80"
              >
                <SiteLogo src={siteLogoUrl} title={brandName} className="h-7 md:h-9 lg:h-10" />
              </Link>
            </Div>
          ) : (
            navSlot && <Div className="hidden md:flex">{navSlot}</Div>
          )}

          {/* Right: #3 — all action buttons.
              wishlist/cart/profile shown only on lg+ here — TB2 carries them on mobile. */}
          <Row gap="xs">
            {devSlot}
            {compareEl}
            {notificationSlot}
            {notificationsEl && <Div className="hidden lg:flex">{notificationsEl}</Div>}
            {wishlistEl && <Div className="hidden lg:flex">{wishlistEl}</Div>}
            {cartEl && <Div className="hidden lg:flex">{cartEl}</Div>}
            {user
              ? profileEl && <Div className="hidden lg:flex">{profileEl}</Div>
              : authButtonsEl ?? (profileEl && <Div className="hidden lg:flex">{profileEl}</Div>)
            }
            {searchBtn}
            {promotionsEl}
            {themeBtn}
            {hamburgerBtn}
          </Row>
        </Row>

        {/* TB2 — secondary row, mobile only (below lg).
            Bottom nav (BN-1) is shown on the same breakpoint — TB2 carries
            wishlist/cart/profile since BN-1 does not have those slots. */}
        {hasTb2 && (
          <Row
            as="nav"
            aria-label="Account actions"
            justify="end"
            gap="xs"
            className="flex lg:hidden h-10 border-t border-zinc-100 dark:border-slate-800 px-1"
          >
            {notificationsEl}
            {wishlistEl}
            {cartEl}
            {profileEl}
          </Row>
        )}
      </Div>
    </BlockHeader>
  );
}
