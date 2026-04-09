"use client";

import React from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

const VARIANTS = {
  default:
    "text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors",
  muted:
    "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors",
  underline:
    "text-primary-600 dark:text-primary-400 underline hover:no-underline transition-all",
  none: "",
} as const;

export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  /**
   * Set to true to render a plain `<a>` targeting "_blank" with rel="noopener noreferrer".
   * Defaults to false — renders a Next.js `<Link>` for SPA navigation.
   */
  external?: boolean;
}

/**
 * Styled anchor wrapper. Uses `next/link` for internal navigation and
 * a plain `<a>` for external links.
 *
 * @example
 * ```tsx
 * <TextLink href="/products">View all products</TextLink>
 * <TextLink href="https://example.com" external>External site</TextLink>
 * ```
 */
export function TextLink({
  href,
  children,
  variant = "default",
  external = false,
  className = "",
  ...props
}: TextLinkProps) {
  const cls = twMerge(VARIANTS[variant], className);

  if (external) {
    return (
      <a
        href={href}
        className={cls}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} {...(props as Record<string, unknown>)}>
      {children}
    </Link>
  );
}
