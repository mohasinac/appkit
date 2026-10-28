import Link from "next/link";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { BlockHeader, Section } from "../../ui/components/Semantic";
import { Div } from "../../ui/components/Div";
import { Icon } from "../../ui/components/Icon";
import { IconButton } from "../../ui/components/IconButton";
import { Row } from "../../ui/components/Layout";
import { SiteLogo } from "../../ui/components/SiteLogo";
import { SiteMark } from "../../ui/components/SiteMark";
import { Span } from "../../ui/components/Typography";

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
  /**
   * TLD badge for the SVG wordmark, e.g. `"in"`. Omitted renders no badge.
   *
   * A5 — the badge used to be a hardcoded `.in` inside `SiteLogo`, so every
   * consumer of appkit got one marketplace's TLD drawn into its header.
   */
  brandTld?: string;
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
  /** D9 — chat. Rendered beside the notification bell when provided; absent entirely when chat is off (`siteSettings.chat.enabled !== true`), not merely empty. */
  messagesHref?: string;
  unreadMessageCount?: number;
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
 * Applied to the GLYPH, never the link, when the icon is carrying something.
 *
 * On the glyph so the count badge stays put: animating the link would swing
 * the number with it, which turns a readable badge into a moving target. The
 * keyframes and the `prefers-reduced-motion` opt-out live in
 * `TitleBarLayout.style.css`.
 */
const nudgeWhenCarrying = (count: number): string =>
  count > 0 ? "appkit-nav-icon--has-items" : "";

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
  brandTld,
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
  messagesHref,
  unreadMessageCount = 0,
  loginHref,
  registerHref,
  user,
  notificationSlot,
  devSlot,
  navSlot,
  promoStripText,
  isDark = false,
  onToggleTheme,
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
      <Icon name="notification" size="lg" className={nudgeWhenCarrying(unreadNotificationCount)} />
      {unreadNotificationCount > 0 && (
        <Span className={countBadge}>
          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
        </Span>
      )}
    </Link>
  ) : null;

  // D9 — chat. Same shape as the notification bell: absent entirely when no
  // href is supplied (the consumer only passes one when
  // `siteSettings.chat.enabled === true`), never rendered-but-disabled.
  const messagesEl = messagesHref ? (
    <Link
      href={messagesHref}
      aria-label={`Messages${unreadMessageCount > 0 ? `, ${unreadMessageCount} unread` : ""}`}
      className={`relative ${iconBtn}`}
    >
      <Icon name="message" size="lg" className={nudgeWhenCarrying(unreadMessageCount)} />
      {unreadMessageCount > 0 && (
        <Span className={countBadge}>{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</Span>
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
      <Icon name="wishlist" size="lg" className={nudgeWhenCarrying(wishlistCount)} />
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
      <Icon name="cart" size="lg" className={nudgeWhenCarrying(cartCount)} />
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

  const hasTb2 = !!(notificationsEl || messagesEl || wishlistEl || cartEl || profileEl);

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
            left-hand mode.

            🛑 THREE IN-FLOW TRACKS — do not take the centre mark out of flow.
            The two side rows are `flex-1` with NO `min-w-0`, so each is at
            least its own min-content and they otherwise split the free space
            evenly: the centre track therefore sits at the row's midpoint
            whenever there is room, and the mark is exactly centred without
            `left-1/2`. When the action cluster outgrows its half, the left
            track yields and the mark SHIFTS — it can never be overlapped.

            It used to be `absolute left-1/2 -translate-x-1/2`, i.e. out of
            flex flow, so `justify="between"` reserved no space for it and the
            right-hand cluster grew straight over it. The two sides also reveal
            at different breakpoints — the mark at `md`, the bell/messages/
            wishlist/cart at `lg` — so from `lg` to ~1150px the cluster's left
            edge crossed the midpoint and sat on top of the first icons in it.
            Signed out was worse: "Sign in + Register" (~160px) stands in for a
            44px avatar. No breakpoint can answer "does this fit"; only layout
            can. */}
        <Row gap="none" reverse="hand" className="relative h-14">
          {/* Left: #1 — the wordmark, always shown, at every width.

              🛑 It used to prefix a SECOND copy of the icon mark here below
              `md`, because the centred mark in track #2 was `hidden md:flex`.
              That is no longer true — the centred mark now renders at every
              width (see #2) — so the prefix was removed: two marks in one
              header is not a brand, it is a bug.

              `reverse="hand"` is required now that this row is a wide `flex-1`
              track rather than an auto-width item: `justify-content:flex-start`
              under `row-reverse` packs at the RIGHT edge, which is where the
              wordmark belongs in left-hand mode. Without it the content would
              hug the track's left edge and leave a gap at the viewport edge. */}
          <Row gap="3" reverse="hand" className="flex-1">
            <Link
              href={logoHref}
              aria-label={brandName}
              className="flex items-center gap-[var(--appkit-space-2)] transition-opacity hover:opacity-80"
            >
              <SiteLogo title={brandName} wordmark={brandName} tld={brandTld} size="md" />
            </Link>
          </Row>

          {/* Centre: #2 — icon mark, always centred on desktop. `src` falls
              back to the theme-aware inline mark when no admin logo image is
              configured, and swaps to the admin's raster upload when one is.

              Hand-neutral by design — do NOT add `reverse="hand"` here. It is
              the middle of three tracks, so it stays put when the two sides
              swap; a centred brand mark must not move with hand mode. It holds
              one child, so reversing would be a no-op on its contents anyway.

              🛑 It was `hidden md:flex` until 2026-10-19, i.e. the brand mark
              was absent from the header on every phone — reported as "in mobile
              this gets hidden, can we make it visible". It is now shown at
              every width, one size smaller below `md`.

              Showing it on a narrow viewport is safe BY CONSTRUCTION and does
              not reopen the overlap this three-track layout was built to fix:
              the mark is an in-flow flex item, not `absolute left-1/2`, so when
              the action cluster needs the room the centre track is PUSHED
              aside rather than drawn over. That is the whole point of the
              comment above — the old absolute version is what could be
              overlapped, and the only reason this track was hidden on mobile
              was the duplicate prefix mark in track #1, now removed. */}
          <Row className="flex flex-none" align="center">
            <Link
              href={logoHref}
              aria-label={brandName}
              className="flex items-center transition-opacity hover:opacity-80"
            >
              {/* `size="lg"` is unchanged and already responsive —
                  `h-9 md:h-11 lg:h-12`, so the mark is 36px inside the 56px
                  bar on a phone and grows from `md` exactly as before. No new
                  prop was needed; only the `hidden` had to go. */}
              {/* `brandShortName` keeps its reader here — it belonged to the
                  removed mobile prefix mark, and the icon-only mark is exactly
                  where a short brand name is the right accessible title. */}
              <SiteMark
                src={siteLogoUrl}
                title={brandShortName ?? brandName}
                size="lg"
              />
            </Link>
          </Row>

          {/* Right: #3 — all action buttons (left edge in left-hand mode).
              wishlist/cart/profile shown only on lg+ here — TB2 carries them on mobile.
              Mirrored so the hamburger stays in the outermost corner.

              `justify="end"` is CORRECT alongside `reverse="hand"` — the same
              reasoning as TB2 below. `row-reverse` inverts the main axis, so
              main-end IS the left edge, and one declaration pins this cluster
              to the outer edge in both hand modes. It is load-bearing now that
              the track is `flex-1` rather than an auto-width item sized by the
              container's `justify="between"`.

              No `min-w-0`: `min-width:auto` keeps this track at least its own
              min-content, so a wide cluster pushes the centre mark aside
              instead of shrinking under it and clipping (the shell is
              `overflow-x-clip`, so clipped is gone, not scrollable). */}
          <Row gap="xs" reverse="hand" justify="end" className="flex-1">
            {devSlot}
            {navSlot}
            {compareEl}
            {notificationSlot}
            {notificationsEl && <Div className="hidden lg:flex">{notificationsEl}</Div>}
            {messagesEl && <Div className="hidden lg:flex">{messagesEl}</Div>}
            {wishlistEl && <Div className="hidden lg:flex">{wishlistEl}</Div>}
            {cartEl && <Div className="hidden lg:flex">{cartEl}</Div>}
            {user
              ? profileEl && <Div className="hidden lg:flex">{profileEl}</Div>
              : authButtonsEl ?? (profileEl && <Div className="hidden lg:flex">{profileEl}</Div>)
            }
            {searchBtn}
            {/*
              * 🛑 Both demoted below `sm` so the HAMBURGER always fits.
              *
              * Measured at a 320px viewport (2026-10-15): this row ran from
              * x=150 to x=384 — 64px past the edge — and the app shell is
              * `overflow-x-clip`, so the excess was not scrollable, it was
              * gone. "Open menu" sat entirely at x=340..384 and the theme
              * toggle was sliced in half. The site's primary menu control was
              * unreachable on a 320px phone.
              *
              * These two are the right things to drop: a product tour and a
              * promotional link are both discretionary, and "Today's Deals"
              * already hides its own label below `sm` (so it was contributing
              * a bare icon). Freeing two 44px targets plus their gaps clears
              * the 64px with room to spare, and nothing load-bearing is lost —
              * both remain reachable from the menu the hamburger now opens.
              */}
            <Div className="hidden sm:flex">{promotionsEl}</Div>
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
            {messagesEl}
            {wishlistEl}
            {cartEl}
            {profileEl}
          </Row>
        )}
      </Div>
    </BlockHeader>
  );
}
