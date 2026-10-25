"use client"
import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LISTING_TYPE_REGISTRY } from "../../_internal/shared/listing-types/_registry";
import { Div } from "../../ui/components/Div";
import { Li, Nav, Ol } from "../../ui/components/Semantic";
import { Span } from "../../ui/components/Typography";

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
  /*
   * Real public route segments whose title-cased form is wrong or ugly.
   * Anything absent here still renders — `capitalize()` title-cases every
   * word, so `digital-codes` reads "Digital Codes" unaided. These are only the
   * ones where casing alone does not get there (`faqs` -> "Faqs",
   * `pre-orders` -> "Pre Orders").
   */
  faqs: "FAQs",
  "pre-orders": "Pre-Orders",
  "prize-draws": "Prize Draws",
  "digital-codes": "Digital Codes",
  beys: "Beyblades",
  parts: "Parts",
  brands: "Brands",
  franchise: "Franchise",
  bundles: "Bundles",
  stores: "Stores",
  sellers: "Sellers",
  events: "Events",
  reviews: "Reviews",
  auctions: "Auctions",
  promotions: "Promotions",
  classified: "Classified",
  live: "Live Items",
  art: "Art",
  stickers: "Stickers",
  catalogue: "Catalogue",
  credits: "Credits",
  about: "About",
  contact: "Contact",
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

/*
 * ── 🛑 THE LAST SEGMENT OF A DETAIL ROUTE IS DATA, NOT A LABEL ─────────────
 *
 * This component only sees `usePathname()`, so it cannot know which segments
 * are dynamic. Title-casing one anyway produced, verbatim in production:
 *
 *     Home / Products / Product beyblade x xtreme stadium bx 10
 *
 * while the page's OWN breadcrumb, rendered directly beneath it, correctly
 * read `Xtreme Stadiums › Beyblade X Xtreme Stadium (BX-10)`. Only the page
 * holds the real title; a pathname cannot be turned into one.
 *
 * So an entity id is OMITTED rather than guessed at — the breadcrumb simply
 * ends at `Home / Products`, which is true, useful and navigable.
 *
 * 🛑 CORRECTED 2026-10-21 — this read "Every detail page in this app renders
 * its own trail with real titles, which is why dropping the crumb loses
 * nothing", and that is FALSE. Measured across five detail views: only
 * `ProductDetailPageView` renders one. `AuctionDetailPageView`,
 * `StoreDetailLayoutView`, `BlogPostView` and `BrandDetailPageView` render
 * NONE, so on those four the shortened trail above is the only breadcrumb
 * there is.
 *
 * That does not change the decision — a trail ending at `Home / Auctions` is
 * still correct, and title-casing an id produced
 * `Product beyblade x xtreme stadium bx 10`, which was not. But the
 * justification matters, because the false version invites the obvious next
 * move: "detail pages have their own trail, so suppress this component on
 * detail routes entirely". That would strip the breadcrumb from those four
 * surfaces. The duplicate is handled by `:has()` in
 * `AutoBreadcrumbs.style.css`, which fires only where a page actually
 * renders its own.
 *
 * 🛑 The listing prefixes are READ FROM `LISTING_TYPE_REGISTRY`, never
 * re-listed here. Two enumerations of one union always drift (Root Cause #42 /
 * #61), and that registry is already the single source for all nine listing
 * types' `slugPrefix`.
 *
 * The non-listing prefixes below cannot come from there because no registry
 * covers them; they are the documented slug-prefix system in CLAUDE.md, and
 * only the ones that actually appear in a PUBLIC url are listed — an
 * `order-`/`payout-`/`notif-` id never reaches a public breadcrumb.
 *
 * 🛑 This does NOT catch a prefix-less slug: `/beys/variares-d-d` still renders
 * "Variares D D". That is a known, accepted limitation rather than an
 * oversight — it is readable, it is not an id-shaped string, and the bey page's
 * own breadcrumb carries the proper name. Fixing it properly means the page
 * supplying its leaf label, which is plumbing this component cannot do alone.
 */
const NON_LISTING_PUBLIC_PREFIXES = [
  "category-",
  "brand-",
  "store-",
  "blog-",
  "event-",
  "review-",
  "faq-",
  "coupon-",
  "group-",
  "sublisting-",
  "user-",
  "mycatalog-",
  "catalog-",
  "scammer-",
] as const;

function isOpaqueEntityId(seg: string): boolean {
  const listingPrefixes = Object.values(LISTING_TYPE_REGISTRY)
    .map((p) => p.slugPrefix)
    .filter((p): p is string => Boolean(p));
  return [...listingPrefixes, ...NON_LISTING_PUBLIC_PREFIXES].some((p) =>
    seg.startsWith(p),
  );
}

/**
 * Title-case a hyphenated path segment — EVERY word, not just the first.
 *
 * The previous implementation uppercased only `charAt(0)`, so a multi-word
 * segment came out as sentence-case mush ("Pre orders", "Digital codes").
 */
function capitalize(s: string) {
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

  const rawSegments = pathname.split("/").filter(Boolean);
  const leadingSegment = rawSegments[0]?.toLowerCase();
  const hasLocalePrefix =
    !!leadingSegment &&
    (LOCALE_CODES.has(leadingSegment) ||
      /^[a-z]{2}-[a-z]{2}$/.test(leadingSegment));
  const localePrefix = hasLocalePrefix ? `/${rawSegments[0]}` : "";

  const segments = rawSegments.filter(
    (seg) =>
      !LOCALE_CODES.has(seg.toLowerCase()) &&
      !/^[0-9a-f-]{8,}$/.test(seg) &&
      !/^\d+$/.test(seg) &&
      /* An entity id carries no label a pathname can recover — see above. */
      !isOpaqueEntityId(seg),
  );

  if (segments.length === 0) return null;

  /*
   * 🛑 NOT RENDERED INSIDE A DASHBOARD, and the argument is redundancy rather
   * than taste.
   *
   * On `/admin/products` this band reads "Home / Admin / Products" directly
   * above an `<h1>Products</h1>` — which `DataListingView` and `FormShell`
   * both render now — while the sidebar has that group open and its link
   * marked via `activePath`. Three statements of the same position, in a
   * ~38px strip that is NOT sticky, so it scrolls away and contributes
   * nothing after the first screen. It is pure fold cost: measured, the
   * dashboard chrome ran to ~243px before the first row of content.
   *
   * 🛑 The suppression is keyed on being INSIDE A DASHBOARD, never on "is a
   * detail route". A previous version of this file claimed every detail page
   * renders its own trail; measured, only 1 of 5 does — auction, store, blog
   * and brand render none, so a detail-route rule would have stripped the
   * breadcrumb from four public pages that have nothing else. A dashboard has
   * a sidebar and an h1; a public detail page has neither.
   *
   * The regex matches the LOCALE-STRIPPED segments, so it is unaffected by
   * whether a `/en` prefix is present.
   */
  const isDashboard = ["admin", "store", "user"].includes(
    segments[0]?.toLowerCase() ?? "",
  );
  if (isDashboard) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labels[seg] ?? capitalize(seg),
    href: `${localePrefix}/${segments.slice(0, i + 1).join("/")}`,
  }));

  const allCrumbs = [{ label: "Home", href: localePrefix || "/" }, ...crumbs];

  /*
   * 🛑 The `/80` that used to sit in the root className was NOT leading,
   * which is why the hand-sweep that fixed the other 28 missed it and
   * `audit-dead-css-classes` caught it: the regexes assumed
   * `className="/80 …"`, and this was `className="border-y /80 …"`.
   *
   * It is the same codemod residue — a stripped `bg-white/80` leaving its
   * modifier — and the same silent no-op. Dropped rather than restored: the
   * element already takes `surface="default"`, so the translucency it was
   * reaching for belongs in that token, and the two `supports-[…]` rules
   * beside it already handle the backdrop-filter case with their own alphas.
   *
   * 🛑 AND THIS COMMENT LIVES HERE, ABOVE `return`, FOR A REASON. It was
   * written as a `{/* … *␣/}` block between `return (` and the root element —
   * i.e. in EXPRESSION position, where JSX comment syntax is not valid. That
   * does not parse, and it took the whole appkit build down (TS1005 ×3,
   * TS1128, TS1109). A brace-balance check passed it, because `{/* … *␣/}` is
   * brace-balanced; only `tsc` sees it. Never open a JSX comment before the
   * first element.
   */
  return (
    <Div border="default" className="appkit-auto-breadcrumbs border-y backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-slate-950/85" surface="default">
      <Div className="container mx-auto max-w-[1920px] px-[var(--appkit-space-5)] sm:px-[var(--appkit-space-6)] lg:px-[var(--appkit-space-8)]" padding="y-xs">
        <Nav aria-label="Breadcrumb" className={className}>
          <Ol className="flex items-center gap-[var(--appkit-space-2)] flex-wrap" size="sm">
            {allCrumbs.map((crumb, index) => {
              const isLast = index === allCrumbs.length - 1;
              return (
                <Li key={crumb.href} layout="flex-center" gap="2">
                  {isLast ? (
                    <Span
                      aria-current="page" color="primary">
                      {crumb.label}
                    </Span>
                  ) : renderLink ? (
                    renderLink(crumb.href, crumb.label)
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-[var(--appkit-color-text-muted)] hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                  {!isLast && (
                    <Span
                      className="text-[var(--appkit-color-text-muted)]/90 select-none" color="muted"
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
      </Div>
    </Div>
  );
}
