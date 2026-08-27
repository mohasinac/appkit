"use client"
import React from "react";
import { usePathname } from "next/navigation";
import { AvatarDisplay, Li, Span, TextLink } from "../../ui";
import { BottomNavLayout } from "./BottomNavLayout";
import { NavItem } from "./NavItem";
import { useWishlistCount } from "../wishlist/hooks/useWishlistCount";
import { useCartCount } from "../cart/hooks/useCartCount";

/** Badge counter class for the cart/wishlist slots.
 *
 * Horizontal offset comes from `.appkit-hand-badge` + the `--lg` (0.5rem) size
 * modifier (HandMode.style.css), NOT a `-right-2` utility — the badge hugs the
 * icon's outer top corner, which is top-left in left-hand mode. Do not re-add
 * `-right-2`: Tailwind runs with `important: true`, so the utility would beat
 * the unlayered rule and the badge would silently stop mirroring.
 *
 * Colours use the `-solid`/`-on-solid` overlay pair (Root Cause #67), matching
 * TitleBarLayout's `countBadge`. The previous `bg-[var(--appkit-color-error)]` +
 * `text-[var(--appkit-color-text-on-primary)]` used the theme-INVERTING ink
 * token as a fill, which audit-status-color-pairs can't see through arbitrary
 * -value syntax. */
const CLS_COUNT_BADGE = "appkit-hand-badge appkit-hand-badge--lg absolute -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-solid px-[var(--appkit-space-1)] leading-none text-error-on-solid";

export interface BottomNavItem {
  key: string;
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BottomNavbarUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: string;
  avatarMetadata?: { url: string; position: { x: number; y: number }; zoom: number } | null;
  stats?: {
    totalOrders?: number;
    auctionsWon?: number;
    itemsSold?: number;
    reviewsCount?: number;
    rating?: number;
  } | null;
}

export interface BottomNavbarProps {
  /** Authenticated user � if provided, shows profile slot with avatar */
  user?: BottomNavbarUser | null;
  /** Authenticated user's uid — drives the wishlist count badge on the wishlist slot. */
  userId?: string | null;
  /** href for the Home nav item */
  homeHref: string;
  /** href for the Shop/Products nav item */
  shopHref: string;
  /** href for the Cart link */
  cartHref: string;
  /**
   * href for the Wishlist page. When provided (and a `user` is signed in),
   * renders a 6th slot between Cart and Profile so mobile has the same
   * 1-click wishlist access desktop's TitleBar already has.
   */
  wishlistHref?: string;
  /** href for authenticated user Profile page */
  profileHref: string;
  /** href for the Login page (shown when unauthenticated) */
  loginHref: string;
  /** Called when the Search slot is tapped */
  onSearchToggle?: () => void;
  /**
   * When provided, renders these items in the bottom nav (first 4 shown, 5th slot = "More" button).
   * Overrides the hardcoded Home/Shop/Search/Cart/Profile layout.
   */
  navItems?: BottomNavItem[];
  /** Called when the "More" slot is tapped (typically opens the sidebar drawer). */
  onMoreToggle?: () => void;
  /** CSS class applied to the active nav item. Default: "text-primary-600 dark:text-primary-400" */
  activeClassName?: string;
  /** CSS class applied to inactive nav items. Default: "text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)]" */
  inactiveClassName?: string;
  /** CSS class applied to nav icons */
  iconClassName?: string;
  /** CSS class applied to nav labels */
  labelClassName?: string;
  /** Maps a user role string to a CSS badge class */
  getRoleBadgeClass?: (role: string) => string;
}

/**
 * BottomNavbar � mobile bottom navigation bar (5 slots: home, shop, search, cart, profile).
 *
 * Pass `user` from your auth context to render the profile slot with avatar.
 */
export function BottomNavbar({
  user,
  userId,
  homeHref,
  shopHref,
  cartHref,
  wishlistHref,
  profileHref,
  loginHref,
  onSearchToggle,
  navItems,
  onMoreToggle,
  activeClassName = "text-primary-600 dark:text-primary-400",
  inactiveClassName = "text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)]",
  iconClassName,
  labelClassName = "text-[11px] leading-tight font-medium",
  getRoleBadgeClass,
}: BottomNavbarProps) {
  const pathname = usePathname();
  const wishlistCount = useWishlistCount(userId);
  const cartCount = useCartCount(!!userId);

  const labels = {
    mobileNav: "Mobile navigation",
    home: "Home",
    products: "Products",
    search: "Search",
    wishlist: "Wishlist",
    cart: "Cart",
    profile: "Profile",
    more: "More",
  } as const;

  const slotClassName = "relative flex h-full w-full flex-col items-center justify-center gap-[var(--appkit-space-1)] text-center transition-colors duration-200";
  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  if (navItems && navItems.length > 0) {
    // Trade one nav-item slot for a dedicated Cart slot so mobile has
    // 1-click cart access with a live item-count badge (previously this
    // slot was Wishlist — Wishlist remains reachable from the header/app
    // bar, it's just no longer duplicated in the bottom tab bar).
    const visibleItems = navItems.slice(0, cartHref ? 3 : 4);
    return (
      <BottomNavLayout ariaLabel={labels.mobileNav}>
        {visibleItems.map((item) => (
          <Li key={item.key} className="flex-1">
            <NavItem
              href={item.href}
              label={item.label}
              icon={item.icon ?? defaultIcon}
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))}
              variant="vertical"
              activeClassName={activeClassName}
              inactiveClassName={inactiveClassName}
              iconClassName={iconClassName}
              labelClassName={labelClassName}
            />
          </Li>
        ))}
        {cartHref && (
          <Li className="flex-1">
            <TextLink
              href={cartHref}
              variant="none"
              className={`${slotClassName} ${
 pathname === cartHref ? activeClassName : inactiveClassName
 }`}
              aria-label={cartCount > 0 ? `${labels.cart}, ${cartCount} items` : labels.cart}
            >
              <Span className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <Span size="xs" weight="semibold" className={CLS_COUNT_BADGE}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </Span>
                )}
              </Span>
              <Span className={labelClassName}>{labels.cart}</Span>
            </TextLink>
          </Li>
        )}
        <Li className="flex-1">
          <button
            type="button"
            onClick={onMoreToggle}
            className={`${slotClassName} ${inactiveClassName}`}
            aria-label={labels.more}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <Span className={labelClassName}>{labels.more}</Span>
          </button>
        </Li>
      </BottomNavLayout>
    );
  }

  return (
    <BottomNavLayout ariaLabel={labels.mobileNav}>
      {/* 1 — Home */}
      <Li
        className="flex-1"
      >
        <NavItem
          href={homeHref}
          label={labels.home}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          isActive={pathname === homeHref}
          variant="vertical"
          activeClassName={activeClassName}
          inactiveClassName={inactiveClassName}
          iconClassName={iconClassName}
          labelClassName={labelClassName}
        />
      </Li>

      {/* 2 — Shop */}
      <Li
        className="flex-1"
      >
        <NavItem
          href={shopHref}
          label={labels.products}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          isActive={pathname === shopHref}
          variant="vertical"
          activeClassName={activeClassName}
          inactiveClassName={inactiveClassName}
          iconClassName={iconClassName}
          labelClassName={labelClassName}
        />
      </Li>

      {/* 3 — Search */}
      <Li
        className="flex-1"
      >
        <button
          type="button"
          onClick={onSearchToggle}
          className={`${slotClassName} ${inactiveClassName}`}
          aria-label={labels.search}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Span className={labelClassName}>{labels.search}</Span>
        </button>
      </Li>

      {/* 4 — Cart */}
      <Li
        className="flex-1"
      >
        <TextLink
          href={cartHref}
          variant="none"
          className={`${slotClassName} ${
 pathname === cartHref ? activeClassName : inactiveClassName
 }`}
          aria-label={cartCount > 0 ? `${labels.cart}, ${cartCount} items` : labels.cart}
        >
          <Span className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <Span size="xs" weight="semibold" className={CLS_COUNT_BADGE}>
                {cartCount > 9 ? "9+" : cartCount}
              </Span>
            )}
          </Span>
          <Span className={labelClassName}>{labels.cart}</Span>
        </TextLink>
      </Li>

      {/* 5 — Wishlist (mobile parity with desktop TitleBar's 1-click wishlist icon) */}
      {wishlistHref && (
        <Li className="flex-1">
          <TextLink
            href={wishlistHref}
            variant="none"
            className={`${slotClassName} ${
 pathname === wishlistHref ? activeClassName : inactiveClassName
 }`}
            aria-label={wishlistCount > 0 ? `${labels.wishlist}, ${wishlistCount} items` : labels.wishlist}
          >
            <Span className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <Span size="xs" weight="semibold" className={CLS_COUNT_BADGE}>
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </Span>
              )}
            </Span>
            <Span className={labelClassName}>{labels.wishlist}</Span>
          </TextLink>
        </Li>
      )}

      {/* 6 — Profile / Login */}
      <Li
        className="flex-1"
      >
        {user ? (
          <TextLink
            href={profileHref}
            variant="none"
            className={`${slotClassName} ${
 pathname === profileHref ? activeClassName : inactiveClassName
 }`}
            aria-label={labels.profile}
          >
            <AvatarDisplay
              cropData={
                user.avatarMetadata ||
                (user.photoURL ? { url: user.photoURL, position: { x: 50, y: 50 }, zoom: 1 } : null)
              }
              size="sm"
              alt={user.displayName || "User"}
              displayName={user.displayName}
              email={user.email}
            />
            {user.role && (
              <Span
                className={`text-[7px] uppercase leading-none ${ getRoleBadgeClass ? getRoleBadgeClass(user.role) : "text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)]" }`} weight="semibold"
              >
                {user.role}
              </Span>
            )}
          </TextLink>
        ) : (
          <NavItem
            href={loginHref}
            label={labels.profile}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            isActive={pathname === loginHref}
            variant="vertical"
            activeClassName={activeClassName}
            inactiveClassName={inactiveClassName}
            iconClassName={iconClassName}
            labelClassName={labelClassName}
          />
        )}
      </Li>
    </BottomNavLayout>
  );
}
