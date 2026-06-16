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

type LinkTypographySize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
type LinkTypographyWeight = "light" | "normal" | "medium" | "semibold" | "bold";
type LinkTruncate = boolean | 1 | 2 | 3 | 4;

const LINK_SIZE_MAP: Record<LinkTypographySize, string> = {
  xs: "appkit-text--xs",
  sm: "appkit-text--sm",
  base: "appkit-text--base",
  lg: "appkit-text--lg",
  xl: "appkit-text--xl",
  "2xl": "appkit-text--2xl",
};

const LINK_WEIGHT_MAP: Record<LinkTypographyWeight, string> = {
  light: "appkit-font--light",
  normal: "appkit-font--normal",
  medium: "appkit-font--medium",
  semibold: "appkit-font--semibold",
  bold: "appkit-font--bold",
};

function truncateClass(truncate: LinkTruncate | undefined): string {
  if (!truncate) return "";
  const lines = typeof truncate === "number" ? truncate : 1;
  return `appkit-text--truncate-${lines}`;
}

type LinkRounded = "none" | "default" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
const LINK_ROUNDED_MAP: Record<LinkRounded, string> = {
  none: "",
  default: "rounded",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  /** Optional typography size override. */
  size?: LinkTypographySize;
  /** Optional typography weight override. */
  weight?: LinkTypographyWeight;
  /** Multi-line clamp. `true` = 1 line; pass `2`, `3`, or `4` for line-clamp. */
  truncate?: LinkTruncate;
  /** Border radius for card-style links. */
  rounded?: LinkRounded;
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
  size,
  weight,
  truncate,
  rounded,
  external,
  className = "",
  ...props
}: TextLinkProps) {
  const cls = twMerge(
    VARIANTS[variant],
    size ? LINK_SIZE_MAP[size] : "",
    weight ? LINK_WEIGHT_MAP[weight] : "",
    truncateClass(truncate),
    rounded ? LINK_ROUNDED_MAP[rounded] : "",
    className,
  );
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
