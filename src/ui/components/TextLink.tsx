import React from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

const VARIANTS = {
  default: "appkit-text-link appkit-text-link--default",
  muted: "appkit-text-link appkit-text-link--muted",
  underline: "appkit-text-link appkit-text-link--underline",
  /** Navigation link — secondary text colour, hover to primary, no underline. */
  nav: "appkit-text-link appkit-text-link--nav",
  /** Danger / destructive link — red text with hover underline. */
  danger: "appkit-text-link appkit-text-link--danger",
  /** Inherit the surrounding text colour; adds underline on hover only. */
  inherit: "appkit-text-link appkit-text-link--inherit",
  /** Bare — no colour or decoration applied. Pass `className` for custom styles. */
  bare: "",
  none: "",
} as const;

/** Returns true when `href` should open in a new tab (http/https/mailto/tel). */
function isExternalUrl(href: string): boolean {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  /**
   * Force external rendering (`<a target="_blank" rel="noopener noreferrer">`).
   * Auto-detected when `href` starts with http/https/mailto/tel.
   */
  external?: boolean;
}

/**
 * Styled anchor wrapper. Uses `next/link` for internal navigation and
 * a plain `<a>` for external/mailto/tel links.
 *
 * External links are auto-detected from the `href` scheme, or can be
 * forced with `external={true}`.
 *
 * @example
 * ```tsx
 * <TextLink href="/products">View all products</TextLink>
 * <TextLink href="https://example.com">External site</TextLink>
 * <TextLink href="/admin" variant="nav">Dashboard</TextLink>
 * <TextLink href="#" variant="danger" onClick={handleDelete}>Delete</TextLink>
 * ```
 */
export function TextLink({
  href,
  children,
  variant = "default",
  external,
  className = "",
  ...props
}: TextLinkProps) {
  const cls = twMerge(VARIANTS[variant], className);
  const shouldBeExternal = external ?? isExternalUrl(href);

  if (shouldBeExternal) {
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
