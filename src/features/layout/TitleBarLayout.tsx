import Link from "next/link";
import React from "react";
import { Avatar, BlockHeader, Div, Icon, IconButton, Row, Section, SiteLogo, SiteMark, Span } from "../../ui";

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
  /** When provided, renders a tour-start icon button before the theme toggle. Null in Patch 1. */
  onTourStart?: () => void;
  id?: string;
  className?: string;
}

/**
 * Shared class for the LINK-wrapped icon controls (bell, wishlist, cart,
 * compare, profile). The button-wrapped ones use `<IconButton size="touch">`,
 * whose CSS owns its own box.
 *
 * 2.75rem matches `.appkit-icon-button--touch` so the two kinds sit at one
 * size in the row. It replaced `w-9 h-9` (36px), which was the same box the
 * four <Button size="sm"> controls claimed — except those also carried
 * `.appkit-button--sm`'s 0.75rem horizontal padding INSIDE it, leaving a 12px
 * content box. The raw <svg> children had no `shrink-0`, so they shrank from
 * 20px to about 12px and rendered squashed, while these link icons rendered
 * full size. That is the visible difference this fixes.
 */
const iconBtn =
  "flex items-center justify-center w-11 h-11 rounded-lg text-[var(--appkit-color-text-muted)] hover:bg-primary-surface hover:text-primary-700 dark:hover:text-secondary-400 transition-colors";

/** Badge counter class for wishlist/cart counts.
 *
 * The horizontal offset lives in `.appkit-hand-badge` (HandMode.style.css), NOT
 * in a `-right-*` utility — the badge hugs the icon's outer top corner, which
 * is top-left in left-hand mode. Do not re-add `-right-0.5`: Tailwind runs with
 * `important: true`, so the utility would beat the unlayered rule and the badge
 * would silently stop mirroring. The vertical `-top-0.5` is hand-neutral and stays. */
const countBadge =
  "appkit-hand-badge absolute -top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-error-solid text-error-on-solid text-[10px] font-bold leading-none";

/**
 * TitleBarLayout — generic top sticky title-bar shell.
 *
 * Layout:
 *  TB1 (h-14, all screens): wordmark (+ mark on mobile) | centred mark (md+) | [secondary actions lg+] | search | deals | theme | hamburger
 *  TB2 (h-10, below lg only): wishlist | cart | profile  — mirrors what TB1 hides below lg
 *
 * Hand mode: both rows carry `reverse="hand"`, so in left-hand mode the whole
 * bar mirrors — wordmark to the right edge, action cluster (hamburger
 * outermost) to the left. Purely CSS via `[data-hand]`, so it lands on the
 * first paint and this file stays server-safe (no `useHandMode()`, no
 * `"use client"`). The centred mark and the brand lockup deliberately do not
 * flip; see their inline notes.
 *
 * Receives all domain data as props — zero domain imports.
 */
export function TitleBarLayout({
  onToggleSidebar,
  sidebarOpen,
  onSearchToggle,
  searchOpen,
  brandName,
  brandShortName,
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
  onTourStart,
  hasDashboardNav,
  onToggleDashboardNav,
  hideSidebarToggle = false,
  id = "titlebar",
  className = "",
}: TitleBarLayoutProps) {
  // ── Element builders ────────────────────────────────────────────────────────

  const promotionsEl = promotionsHref ? (
    <Link
      href={promotionsHref}
      aria-label="Today's deals"
      className="flex items-center gap-[var(--appkit-space-1)] px-[var(--appkit-space-3)] py-[var(--appkit-space-1)] rounded-full text-[length:var(--appkit-text-xs)] font-bold bg-primary-100 text-primary-700 dark:bg-secondary-900/40 dark:text-secondary-400 hover:bg-primary-surface transition-colors border border-primary-200/60 dark:border-secondary-700/40"
    >
      <Icon name="deals" size="md" filled />
      <Span className="hidden sm:inline">Today&apos;s Deals</Span>
    </Link>
  ) : null;

  const themeBtn = onToggleTheme ? (
    <IconButton
      size="touch"
      variant="ghost"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggleTheme}
      className={iconBtn}
      icon={<Icon name={isDark ? "themeLight" : "themeDark"} size="lg" />}
    />
  ) : null;

  const tourBtn = onTourStart ? (
    <IconButton
      size="touch"
      variant="ghost"
      aria-label="Start product tour"
      onClick={onTourStart}
      className={iconBtn}
      icon={<Icon name="help" size="lg" />}
    />
  ) : null;

  const hamburgerBtn = !hideSidebarToggle ? (
    <IconButton
      size="touch"
      variant="ghost"
      aria-label={sidebarOpen ? "Close menu" : hasDashboardNav ? "Open dashboard navigation" : "Open menu"}
      aria-expanded={sidebarOpen}
      aria-controls="secondary-sidebar"
      onClick={hasDashboardNav && onToggleDashboardNav ? onToggleDashboardNav : onToggleSidebar}
      className={iconBtn}
      icon={<Icon name={sidebarOpen ? "close" : "menu"} size="lg" />}
    />
  ) : null;

  // Compare is always lg+ (desktop-only feature, less critical on mobile)
  const compareEl = compareHref ? (
    <Link
      href={compareHref}
      aria-label="Compare items"
      className={`${iconBtn} hidden lg:flex`}
    >
      <Icon name="compare" size="lg" />
    </Link>
  ) : null;

  const searchBtn = (
    <IconButton
      size="touch"
      variant="ghost"
      aria-label="Search"
      aria-pressed={searchOpen}
      onClick={onSearchToggle}
      className={iconBtn}
      data-tour="nav-search"
      icon={<Icon name="search" size="lg" />}
    />
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
      <Icon name="notification" size="lg" />
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
      data-tour="nav-wishlist"
    >
      <Icon name="wishlist" size="lg" />
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
      data-tour="nav-cart"
    >
      <Icon name="cart" size="lg" />
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
      data-tour="nav-profile"
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
    // Mirrors with TB1 so Register (the primary CTA) keeps the outer, more
    // reachable edge instead of ending up tucked inside after the flip.
    <Row gap="xs" reverse="hand" className="hidden lg:flex">
      {loginHref && (
        <Link
          href={loginHref}
          className="px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text-muted)] hover:text-primary-700 dark:hover:text-secondary-400 transition-colors rounded-lg hover:bg-primary-surface"
        >
          Sign in
        </Link>
      )}
      {registerHref && (
        <Link
          href={registerHref}
          className="px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors btn-glow shadow-sm"
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
      className={`sticky top-0 z-50 bg-[var(--appkit-color-bg)]/95 backdrop-blur-md border-b border-[var(--appkit-color-border-subtle)] shadow-sm ${className}`}
    >
      {/* Promo strip */}
      {promoStripText && (
        <Section color="inverse" tone="accent-banner" className="text-[length:var(--appkit-text-xs)] text-center font-medium" padding="y-2xs">
          {promoStripText}
        </Section>
      )}

      <Div paddingX="x-page" className="container mx-auto max-w-[1920px]">
        {/* TB1 — primary row, always visible.
            `reverse="hand"` swaps the wordmark and the action cluster in
            left-hand mode. The centred mark below is `position: absolute`, so
            it is out of flow and unaffected — see its own note. */}
        <Row justify="between" gap="none" reverse="hand" className="relative h-14">
          {/* Left: #1 — wordmark, always shown. Mobile also gets the icon
              mark prefixed before the text (md:hidden) since the centred
              mark below has no room on narrow viewports. */}
          <Row gap="3">
            <Link
              href={logoHref}
              aria-label={brandName}
              className="flex items-center gap-[var(--appkit-space-2)] transition-opacity hover:opacity-80"
            >
              <Div className="flex md:hidden">
                <SiteMark title={brandShortName ?? brandName} size="sm" />
              </Div>
              <SiteLogo title={brandName} size="md" />
            </Link>
          </Row>

          {/* Centre: #2 — icon mark, always centred on desktop. `src` falls
              back to the theme-aware inline mark when no admin logo image is
              configured, and swaps to the admin's raster upload when one is.

              Hand-neutral by design — do NOT add `reverse="hand"` here. It is
              absolutely positioned (out of flex flow, so `flex-direction` can't
              reach it) and `left-1/2 -translate-x-1/2` centres it independent of
              its own width. A centred brand mark must not move with hand mode. */}
          <Row className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2" align="center">
            <Link
              href={logoHref}
              aria-label={brandName}
              className="flex items-center transition-opacity hover:opacity-80"
            >
              <SiteMark src={siteLogoUrl} title={brandName} size="lg" />
            </Link>
          </Row>

          {/* Right: #3 — all action buttons (left edge in left-hand mode).
              wishlist/cart/profile shown only on lg+ here — TB2 carries them on mobile.
              Mirrored so the hamburger stays in the outermost corner. */}
          <Row gap="xs" reverse="hand">
            {devSlot}
            {navSlot}
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
            {tourBtn}
            {themeBtn}
            {hamburgerBtn}
          </Row>
        </Row>

        {/* TB2 — secondary row, mobile only (below lg).
            Bottom nav (BN-1) is shown on the same breakpoint — TB2 carries
            wishlist/cart/profile since BN-1 does not have those slots. */}
        {hasTb2 && (
          // `justify="end"` is CORRECT alongside `reverse="hand"` — do not
          // "fix" it to "start". `row-reverse` inverts the main axis, so
          // main-end IS the left edge: flex-end already packs this row left in
          // left-hand mode, in mirrored order (profile leftmost). Adding a raw
          // `justify-start` className would also trip audit-inline-styles'
          // RAW_JUSTIFY_ON_ROW.
          <Row border="subtle"
            as="nav"
            aria-label="Account actions"
            justify="end"
            gap="xs"
            reverse="hand"
            className="flex lg:hidden h-10 border-t px-[var(--appkit-space-1)]"
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
