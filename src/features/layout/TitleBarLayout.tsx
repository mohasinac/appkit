"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { BlockHeader, Button, Div, Row, Span } from "../../ui";

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
  logoHref: string;
  promotionsHref?: string;
  cartHref?: string;
  cartCount?: number;
  profileHref?: string;
  user?: TitleBarUser | null;
  /** Slot rendered between the search button and profile link (e.g. NotificationBell). */
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
  /** Callback to open the registered dashboard navigation drawer. */
  onOpenDashboardNav?: () => void;
  /** Hide the public sidebar toggle button when nested layouts own navigation. */
  hideSidebarToggle?: boolean;
  id?: string;
  className?: string;
}

/**
 * TitleBarLayout — generic top sticky title-bar shell.
 *
 * Receives all domain data as props — zero domain imports.
 * Domain shell reads useAuth() and SITE_CONFIG and passes values in.
 */
export function TitleBarLayout({
  onToggleSidebar,
  sidebarOpen,
  onSearchToggle,
  searchOpen,
  brandName,
  brandShortName,
  logoHref,
  promotionsHref,
  cartHref,
  cartCount = 0,
  profileHref,
  user,
  notificationSlot,
  devSlot,
  navSlot,
  promoStripText,
  isDark = false,
  onToggleTheme,
  hasDashboardNav = false,
  onOpenDashboardNav,
  hideSidebarToggle = false,
  id = "titlebar",
  className = "",
}: TitleBarLayoutProps) {
  void searchOpen;

  return (
    <BlockHeader
      id={id}
      className={`sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-slate-800/80 ${className}`}
    >
      {/* Promo strip */}
      {promoStripText && (
        <Div className="bg-gradient-to-r from-primary-700 to-blue-700 dark:from-secondary-700 dark:to-blue-700 text-white text-xs py-1 text-center font-medium">
          {promoStripText}
        </Div>
      )}

      <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
        <Row justify="between" gap="none" className="h-12">
          {/* Left: hamburger (mobile) + logo */}
          <Row gap="3">
            {!hideSidebarToggle && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={sidebarOpen}
                aria-controls="secondary-sidebar"
                onClick={onToggleSidebar}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {sidebarOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </Button>
            )}

            {hasDashboardNav && onOpenDashboardNav && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Open dashboard navigation"
                onClick={onOpenDashboardNav}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>
            )}

            <Link
              href={logoHref}
              className="font-bold text-lg text-zinc-900 dark:text-zinc-50 hover:opacity-80 transition-opacity"
            >
              {brandShortName ? (
                <>
                  <Span className="md:hidden">{brandShortName}</Span>
                  <Span className="hidden md:inline">{brandName}</Span>
                </>
              ) : (
                brandName
              )}
            </Link>
          </Row>

          {/* Centre: nav slot (desktop only) */}
          {navSlot && <Div className="hidden md:flex">{navSlot}</Div>}

          {/* Right: actions */}
          <Row gap="xs">
            {/* Promotions */}
            {promotionsHref && (
              <Link
                href={promotionsHref}
                aria-label="Today's deals"
                className="hidden lg:flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors"
              >
                Deals
              </Link>
            )}

            {/* Search toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Search"
              onClick={onSearchToggle}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
            </Button>

            {/* Notification slot */}
            {notificationSlot}

            {/* Dev slot */}
            {devSlot}

            {/* Theme toggle */}
            {onToggleTheme && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={
                  isDark ? "Switch to light mode" : "Switch to dark mode"
                }
                onClick={onToggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isDark ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.73 0-.71-.71M6.34 6.34l-.71-.71M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z"
                    />
                  </svg>
                )}
              </Button>
            )}

            {/* Cart */}
            {cartHref && (
              <Link
                href={cartHref}
                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
                className="relative flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z"
                  />
                </svg>
                {cartCount > 0 && (
                  <Span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {cartCount > 9 ? "9+" : cartCount}
                  </Span>
                )}
              </Link>
            )}

            {/* Profile */}
            {profileHref && (
              <Link
                href={profileHref}
                aria-label={
                  user
                    ? `Profile — ${user.displayName ?? user.email}`
                    : "Sign in"
                }
                className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName ?? "Profile"}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                )}
              </Link>
            )}
          </Row>
        </Row>
      </Div>
    </BlockHeader>
  );
}
