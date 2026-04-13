"use client";

import React from "react";

import { Li, Span } from "../../ui";

export interface BottomNavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | null;
  isActive?: boolean;
  className?: string;
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
 *   <BottomNavItem
 *     href="/products"
 *     icon={<ShoppingBagIcon className="w-6 h-6" />}
 *     label="Shop"
 *     isActive={pathname === "/products"}
 *   />
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
}: BottomNavItemProps) {
  // Use a plain anchor so this component stays framework-agnostic.
  // Consumer projects may swap for next/link if preferred.
  return (
    <Li className="flex-1">
      <a
        href={href}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex flex-col items-center justify-center gap-0.5 h-full w-full min-h-[44px] transition-colors ${
          isActive
            ? "text-primary-600 dark:text-secondary-400"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        }${className ? ` ${className}` : ""}`}
      >
        <Span className="relative">
          {icon}
          {badge != null && badge > 0 && (
            <Span
              aria-label={`${badge} items`}
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-secondary-500 text-white flex items-center justify-center leading-none"
            >
              {badge > 99 ? "99+" : badge}
            </Span>
          )}
        </Span>
        <Span className="text-[10px] font-medium leading-none">{label}</Span>
      </a>
    </Li>
  );
}
