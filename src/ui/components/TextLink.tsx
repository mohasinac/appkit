import React from "react";
import type { JsonValue } from "@mohasinac/appkit";
import Link from "next/link";
import { SHADOW_MAP } from "./surface-tokens";
import type { ShadowKey } from "./surface-tokens";
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

type LinkPaddingX = "none" | "sm" | "md" | "lg" | "xl";
const LINK_PADDING_X_MAP: Record<LinkPaddingX, string> = {
  none: "",
  sm: "px-3",
  md: "px-4",
  lg: "px-5",
  xl: "px-6",
};

type LinkPaddingY = "none" | "xs" | "sm" | "md";
const LINK_PADDING_Y_MAP: Record<LinkPaddingY, string> = {
  none: "",
  xs: "py-2",
  sm: "py-2.5",
  md: "py-3",
};

/** Display layout for button-style / nav-style links. */
type LinkLayout = "flex" | "inline-flex" | "flex-col";
const LINK_LAYOUT_MAP: Record<LinkLayout, string> = {
  flex: "flex",
  "inline-flex": "inline-flex",
  "flex-col": "flex flex-col",
};

/** Cross-axis alignment — only takes effect when `layout` is set. */
type LinkAlign = "center" | "start" | "end" | "stretch" | "baseline";
const LINK_ALIGN_MAP: Record<LinkAlign, string> = {
  center: "items-center",
  start: "items-start",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

/** Main-axis distribution — only takes effect when `layout` is set. */
type LinkJustify = "start" | "center" | "end" | "between" | "around" | "evenly";
const LINK_JUSTIFY_MAP: Record<LinkJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

/** Gap between flex children — only takes effect when `layout` is set. */
type LinkGap = "none" | "xs" | "sm" | "md" | "lg";
const LINK_GAP_MAP: Record<LinkGap, string> = {
  none: "",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
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
  /** Horizontal padding — for button-shaped links (e.g. CTA pills). */
  paddingX?: LinkPaddingX;
  /** Vertical padding — for button-shaped links. */
  paddingY?: LinkPaddingY;
  /**
   * Display layout. Use `"flex"` or `"inline-flex"` to turn the link into a
   * flex container (e.g. nav items that need icon + label side by side).
   * Replaces raw `className="flex"` / `"inline-flex"` tokens.
   */
  layout?: LinkLayout;
  /**
   * Cross-axis alignment. Only takes effect when `layout` is set.
   * Replaces raw `className="items-center"` etc.
   */
  align?: LinkAlign;
  /**
   * Main-axis distribution. Only takes effect when `layout` is set.
   * Replaces raw `className="justify-between"` etc.
   */
  justify?: LinkJustify;
  /**
   * Gap between flex children. Only takes effect when `layout` is set.
   * Replaces raw `className="gap-2"` etc.
   */
  gap?: LinkGap;
  /**
   * Box shadow variant — replaces raw `className="shadow-*"` / `hover:shadow-*`.
   * Uses the same `SHADOW_MAP` as layout primitives.
   */
  shadow?: ShadowKey;
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
  paddingX,
  paddingY,
  layout,
  align,
  justify,
  gap,
  shadow,
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
    paddingX ? LINK_PADDING_X_MAP[paddingX] : "",
    paddingY ? LINK_PADDING_Y_MAP[paddingY] : "",
    layout ? LINK_LAYOUT_MAP[layout] : "",
    align ? LINK_ALIGN_MAP[align] : "",
    justify ? LINK_JUSTIFY_MAP[justify] : "",
    gap ? LINK_GAP_MAP[gap] : "",
    shadow ? SHADOW_MAP[shadow] : "",
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
    <Link href={href} className={cls} {...(props as Record<string, JsonValue>)}>
      {children}
    </Link>
  );
}
