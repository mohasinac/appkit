import React from "react";
import NextLink from "next/link";

import { Li, Span } from "../../ui";

export interface BottomNavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | null;
  isActive?: boolean;
  className?: string;
  /**
   * The link component. Defaults to `next/link`, and that default is
   * load-bearing — see the note at the render below.
   *
   * Override it to supply a locale-aware link (`@/i18n/navigation`), never to go
   * back to a bare anchor. Same contract as `OverflowRow`'s `linkAs`.
   */
  linkAs?: React.ElementType;
}

/**
 * BottomNavItem — a single tap target inside `<BottomNavLayout>`.
 *
 * Renders as `<a>` via Next.js `<Link>`. The consumer project wires
 * `isActive` by comparing the current pathname against `href`.
 *
 * @example
 * ```tsx
 * <BottomNavLayout ariaLabel="Main navigation">
 * <BottomNavItem
 * href="/products"
 * icon={<ShoppingBagIcon className="w-6 h-6" />}
 * label="Shop"
 * isActive={pathname === "/products"}
 * />
 * </BottomNavLayout>
 * ```
 */
export function BottomNavItem({
  href,
  label,
  icon,
  badge,
  isActive = false,
  className,
  linkAs: Link = NextLink,
}: BottomNavItemProps) {
  /*
   * 🛑 `next/link`, not a bare `<a>`. This rendered a plain anchor until
   * 2026-10-24, with two comments in this file contradicting each other about
   * it — the docstring above said "Renders as `<a>` via Next.js `<Link>`" while
   * the line below it said "use a plain anchor so this component stays
   * framework-agnostic". The code did the second, so every tap on the MOBILE
   * BOTTOM NAV — the primary navigation on a phone — was a full page load, and
   * the only symptom is a flash.
   *
   * "Framework-agnostic" was never the real constraint: `OverflowRow` has
   * imported `next/link` as its `linkAs` default since it shipped, and
   * CLAUDE.md records that default as load-bearing for exactly this reason. The
   * same escape hatch is here, so a consumer can still inject a locale-aware
   * link.
   */
  return (
    <Li className="flex-1">
      <Link
        href={href}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex flex-col items-center justify-center gap-[var(--appkit-space-0-5)] h-full w-full min-h-[44px] transition-colors ${
 isActive
 ? "text-primary-600 dark:text-secondary-400"
 : "text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)]"
 }${className ? ` ${className}` : ""}`}
      >
        <Span className="relative">
          {icon}
          {badge != null && badge > 0 && (
            <Span layout="flex-center" color="inverse" 
              aria-label={`${badge} items`}
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-[var(--appkit-space-1)] text-[10px] bg-secondary-500 leading-none" rounded="full" weight="bold"
            >
              {badge > 99 ? "99+" : badge}
            </Span>
          )}
        </Span>
        <Span weight="medium" className="text-[10px] leading-none">{label}</Span>
      </Link>
    </Li>
  );
}
