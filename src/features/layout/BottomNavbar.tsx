"use client"
import React from "react";
import { usePathname } from "next/navigation";
import { AvatarDisplay, Button, Li, Span, TextLink } from "../../ui";
import { BottomNavLayout } from "./BottomNavLayout";
import { NavItem } from "./NavItem";

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
  /** href for the Home nav item */
  homeHref: string;
  /** href for the Shop/Products nav item */
  shopHref: string;
  /** href for the Cart link */
  cartHref: string;
  /** href for authenticated user Profile page */
  profileHref: string;
  /** href for the Login page (shown when unauthenticated) */
  loginHref: string;
  /** Called when the Search slot is tapped */
  onSearchToggle?: () => void;
  /** CSS class applied to the active nav item. Default: "text-primary-600 dark:text-primary-400" */
  activeClassName?: string;
  /** CSS class applied to inactive nav items. Default: "text-zinc-500 dark:text-slate-400" */
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
  homeHref,
  shopHref,
  cartHref,
  profileHref,
  loginHref,
  onSearchToggle,
  activeClassName = "text-primary-600 dark:text-primary-400",
  inactiveClassName = "text-zinc-500 dark:text-slate-400",
  iconClassName,
  labelClassName = "text-[10px] leading-none",
  getRoleBadgeClass,
}: BottomNavbarProps) {
  const pathname = usePathname();

  const labels = {
    mobileNav: "Mobile navigation",
    home: "Home",
    products: "Products",
    search: "Search",
    cart: "Cart",
    profile: "Profile",
  } as const;

  const itemStyle = { width: "20%" } as const;

  return (
    <BottomNavLayout ariaLabel={labels.mobileNav}>
      {/* 1 � Home */}
      <Li className="flex-1" style={itemStyle}>
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

      {/* 2 � Shop */}
      <Li className="flex-1" style={itemStyle}>
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

      {/* 3 � Search */}
      <Li className="flex-1" style={itemStyle}>
        <Button
          variant="ghost"
          onClick={onSearchToggle}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200 ${inactiveClassName}`}
          aria-label={labels.search}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Span className={labelClassName}>{labels.search}</Span>
        </Button>
      </Li>

      {/* 4 � Cart */}
      <Li className="flex-1" style={itemStyle}>
        <TextLink
          href={cartHref}
          variant="none"
          className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200 relative ${
            pathname === cartHref ? activeClassName : inactiveClassName
          }`}
          aria-label={labels.cart}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <Span className={labelClassName}>{labels.cart}</Span>
        </TextLink>
      </Li>

      {/* 5 � Profile / Login */}
      <Li className="flex-1" style={itemStyle}>
        {user ? (
          <TextLink
            href={profileHref}
            variant="none"
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200 ${
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
                className={`text-[7px] font-semibold uppercase leading-none ${
                  getRoleBadgeClass ? getRoleBadgeClass(user.role) : "text-zinc-500 dark:text-slate-400"
                }`}
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
