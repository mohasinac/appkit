"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Li, Nav, Ol, Span } from "@mohasinac/ui";

/** Map of path segments → human-readable labels. */
const DEFAULT_PATH_LABELS: Record<string, string> = {
  auth: "Authentication",
  login: "Login",
  register: "Register",
  "forgot-password": "Forgot Password",
  "reset-password": "Reset Password",
  "verify-email": "Verify Email",
  profile: "Profile",
  settings: "Settings",
  admin: "Admin",
  users: "Users",
  dashboard: "Dashboard",
  products: "Products",
  cart: "Cart",
  wishlist: "Wishlist",
  orders: "Orders",
  addresses: "Addresses",
  categories: "Categories",
  search: "Search",
  checkout: "Checkout",
  blog: "Blog",
  view: "View",
  add: "Add",
  edit: "Edit",
};

// Common locale codes filtered out of path segments
const LOCALE_CODES = new Set([
  "en",
  "hi",
  "fr",
  "de",
  "es",
  "pt",
  "zh",
  "ja",
  "ko",
  "ar",
  "mr",
  "bn",
  "ta",
  "te",
  "gu",
  "kn",
  "ml",
  "pa",
  "ur",
]);

export interface AutoBreadcrumbsProps {
  /** Additional path segment → label overrides. Merged with defaults. */
  pathLabels?: Record<string, string>;
  /** Custom separator. Defaults to "/" */
  separator?: React.ReactNode;
  className?: string;
  /** Custom link renderer — defaults to a plain `<a>`. */
  renderLink?: (href: string, label: string) => React.ReactNode;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

/**
 * AutoBreadcrumbs — generates breadcrumb navigation automatically from the
 * current URL path. Zero props required for basic use.
 */
export function AutoBreadcrumbs({
  pathLabels,
  separator = "/",
  className = "",
  renderLink,
}: AutoBreadcrumbsProps) {
  const pathname = usePathname();
  const labels = { ...DEFAULT_PATH_LABELS, ...pathLabels };

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter(
      (seg) =>
        !LOCALE_CODES.has(seg.toLowerCase()) &&
        !/^[0-9a-f-]{8,}$/.test(seg) &&
        !/^\d+$/.test(seg),
    );

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labels[seg] ?? capitalize(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  const allCrumbs = [{ label: "Home", href: "/" }, ...crumbs];

  return (
    <Nav aria-label="Breadcrumb" className={className}>
      <Ol className="flex items-center gap-2 text-sm flex-wrap">
        {allCrumbs.map((crumb, index) => {
          const isLast = index === allCrumbs.length - 1;
          return (
            <Li key={crumb.href} className="flex items-center gap-2">
              {isLast ? (
                <Span
                  aria-current="page"
                  className="text-zinc-500 dark:text-zinc-400"
                >
                  {crumb.label}
                </Span>
              ) : renderLink ? (
                renderLink(crumb.href, crumb.label)
              ) : (
                <Link
                  href={crumb.href}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
              {!isLast && (
                <Span
                  className="text-zinc-400 dark:text-zinc-500 select-none"
                  aria-hidden="true"
                >
                  {separator}
                </Span>
              )}
            </Li>
          );
        })}
      </Ol>
    </Nav>
  );
}
