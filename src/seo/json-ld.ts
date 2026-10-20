/**
 * JSON-LD Structured Data Helpers
 *
 * Generates Schema.org JSON-LD objects for rich search results.
 *
 * @example
 * ```tsx
 * import { productJsonLd } from "./";
 * <script
 * type="application/ld+json"
 * dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
 * />
 * ```
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "App";

/**
 * schema.org requires ABSOLUTE URLs. A relative `image` or `item` is not a
 * lenient-parse case — Google rejects the property, and `image` is *required*
 * for Product rich results, so a relative one costs the whole rich result.
 *
 * `productJsonLd` prefixed `url` and `offers.url` with SITE_URL but passed
 * `image[]` through untouched, so every product emitted four relative
 * `/api/media/ext?...` image URLs and no product could earn a rich result.
 *
 * Leaves already-absolute URLs (and `data:` URIs) alone. Returns undefined for
 * an empty value so `JSON.stringify` drops the key rather than emitting `""`.
 */
function absoluteUrl(value: unknown, base: string = SITE_URL): string | undefined {
  /*
   * 🛑 `unknown` + a typeof test, NOT `string | null | undefined` + `?.trim()`.
   *
   * This took production down for hours. The signature said `string`, every
   * caller type-checked, and then `ProductImage[]` replaced `string[]` on the
   * product document — so `images.map(absoluteUrl)` received OBJECTS, `?.trim`
   * was not a function, and the throw escaped into the RSC render and 500'd
   * `/[locale]/products/[slug]` and `/[locale]/auctions/[id]`: **72 recorded
   * failures**, the whole page lost to a decorative metadata field.
   *
   * A declared parameter type is a compile-time claim about CALLERS. It is
   * worth nothing at the boundary where data arrives from Firestore, which is
   * exactly where this function sits — and a schema migration is precisely the
   * event that makes the claim false everywhere at once.
   *
   * So the contract is now behavioural: anything that is not a usable string
   * is DROPPED, and the key is omitted. JSON-LD is optional enrichment —
   * losing one image costs a rich-result thumbnail, while throwing costs the
   * entire page. Those are not close.
   */
  const v = typeof value === "string" ? value.trim() : undefined;
  if (!v) return undefined;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;
  if (!base) return undefined; // no base to resolve against — omit rather than emit a bare path
  return `${base.replace(/\/+$/, "")}/${v.replace(/^\/+/, "")}`;
}

import { ProductStatusValues } from "../features/products/schemas";
import { getDefaultCurrency } from "../core/baseline-resolver";
// The defining module, never the `/client` entry: this file is reached from
// server-only metadata paths and must not pull in a `"use client"` module
// (Root Cause #76/#93).
import { ROUTES } from "../next/routing/route-map";
import type { ListingType } from "../features/products/types";

/**
 * JSON-LD permits omitting optional fields at every nesting level — JSON.stringify
 * drops undefined keys, so the emitted schema.org output remains valid. This
 * recursive type allows `undefined` anywhere inside the tree.
 */
type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

// --- Input Types --------------------------------------------------------------

export interface ProductJsonLdInput {
  id: string;
  title: string;
  description: string;
  slug: string;
  price: number;
  currency: string;
  mainImage?: string;
  /**
   * Prefer `productImageUrls(doc.images)`. The object form is accepted so a
   * document holding `ProductImage[]` cannot take the page down — see the
   * note on `imageUrlOf` in `productJsonLd`.
   */
  images?: readonly (string | { url?: string })[];
  sellerName?: string;
  category?: string;
  status?: string;
  auctionEndDate?: Date;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
  /**
   * The path this listing actually lives at, e.g. `/auctions/{slug}`.
   *
   * 🛑 Both builders hardcoded `/products/${slug}`, so an auction's own
   * structured data advertised its offer — and its `url` — at a path that
   * belongs to a different listing type. Measured live: the block on
   * `/auctions/auction-beyblade-metal-lightning-l-drago` carried
   * `offers.url: ".../products/auction-beyblade-metal-lightning-l-drago"`,
   * and that URL served a full standard product page with Buy Now and Add to
   * Cart and no bid controls at all. So the one consumer that reads this field
   * — a crawler — was sent to the wrong page, and told it was canonical there.
   *
   * Six of the nine listing types have their own detail route (Root Cause
   * #48), so `/products/{slug}` is a wrong default for two thirds of them.
   *
   * Defaults to `/products/${slug}` when omitted, which is correct for
   * `standard`, `art` and `stickers` — the three that genuinely live there —
   * and keeps every existing caller behaving exactly as before. The caller
   * knows its own route; resolving it here would mean importing the listing-type
   * registry into `seo/`, which must stay reachable from server-only metadata
   * paths without widening its import graph (Root Cause #76).
   */
  detailPath?: string;
  /**
   * Denormalised rating, straight off `ProductDocument.avgRating` /
   * `.reviewCount` — so emitting it costs **zero** extra Firestore reads.
   *
   * Merged into THIS node rather than emitted as a separate `Product` via
   * `aggregateRatingJsonLd`, which builds a second node carrying only
   * name/url/aggregateRating and no `offers`. Two `Product` nodes for one page
   * duplicates the entity, and a `Product` with no offers is incomplete for
   * Google — merging is the shape that actually earns review stars.
   *
   * Deliberately NOT accompanied by per-review `Review` nodes: schema.org
   * `Review.author` is personal data, and reviewer names are masked on public
   * surfaces (`maskPublicReview`). The stars in a SERP come from the aggregate,
   * so this yields the full benefit with no identity exposure.
   */
  rating?: { average: number; count: number };
}

export interface ReviewJsonLdInput {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  productTitle?: string;
}

export interface FaqJsonLdInput {
  question: string;
  answer: string;
}

export interface BreadcrumbJsonLdItem {
  name: string;
  /**
   * Absent on the LAST crumb — the page you are already on.
   *
   * 🛑 This was required, and `url.startsWith(...)` threw on a missing one. It
   * is optional because schema.org's own breadcrumb guidance is that the final
   * element identifies the current page and its `item` may be omitted; a
   * self-link there is accepted but says nothing. Every existing caller passes
   * a url, so widening it breaks none of them.
   */
  url?: string;
}

export interface BlogPostJsonLdInput {
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  publishedAt?: Date;
  updatedAt?: Date;
  authorName?: string;
  authorAvatar?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// --- Helpers -----------------------------------------------------------------

/**
 * The CSS selector the price gate renders in every state.
 *
 * 🛑 Must equal `GATED_PRICE_CLASS` in `ui/components/GatedPrice.tsx`. It is
 * duplicated as a literal here rather than imported because `seo/` is reached
 * from server-only metadata paths and must not pull in a `"use client"` module
 * (Root Cause #76). `audit-guest-price-leak` cross-checks the two.
 */
const GATED_PRICE_SELECTOR = ".appkit-gated-price";

/**
 * Declares that this page's price is behind a sign-in gate.
 *
 * Prices are hidden from signed-out visitors, and Googlebot crawls signed out —
 * so the crawler sees "Sign in to see price" while the Product JSON-LD beside it
 * declares a real `offers.price`. Left undeclared, that is a structured-data
 * mismatch: Google requires marked-up content to be visible to the user, and an
 * unexplained gap can cost the rich result.
 *
 * `isAccessibleForFree: false` + `hasPart`/`cssSelector` is the supported way to
 * say "the markup is richer than what an anonymous visitor sees". It lives on a
 * `WebPage` node rather than on the Product, because `isAccessibleForFree` is a
 * `CreativeWork` property and `Product` is not a `CreativeWork`.
 *
 * Serving the price to crawler user-agents but not to people would be cloaking,
 * which is a harder violation; this declares the gate instead of hiding it.
 *
 * 🛑 Emit this on EVERY page that emits `offers.price`. The audit enforces the
 * pairing precisely so nobody removes one half later.
 */
export function gatedPriceWebPageJsonLd(path: string): Record<string, JsonLdValue> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    // Absolutised against the ONE canonical host, never a second definition of
    // it (Root Cause #81) — a WebPage node naming a host the sitemap does not
    // advertise is the same split-identity bug in miniature.
    url: absoluteUrl(path),
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: GATED_PRICE_SELECTOR,
    },
  };
}

export function productJsonLd(
  product: ProductJsonLdInput,
): Record<string, JsonLdValue> {
  const url = `${SITE_URL}${product.detailPath ?? `/products/${product.slug}`}`;
  // Absolutise, then de-duplicate: `mainImage` is very often also `images[0]`,
  // which produced the same URL twice in the emitted array.
  /*
   * 🛑 Accepts BOTH shapes on purpose. `absoluteUrl` now drops a non-string
   * instead of throwing, which stops the 500 — but silently dropping every
   * image would trade a crash for an invisible loss of the `image` property
   * that Product rich results REQUIRE. Reading `.url` off an object keeps the
   * rich result working whichever shape the document holds, so a caller that
   * forgets `productImageUrls()` degrades to nothing worse than correct.
   */
  /*
   * The cast narrows to `{ url?: string }` rather than `{ url?: unknown }`
   * (`audit-unknown-leakage` blocks the latter, correctly — an `unknown` in a
   * member position defeats checking on every read below it). The assertion is
   * safe without being trusted: `absoluteUrl` tests `typeof value === "string"`
   * itself, so a document whose `url` is a number is dropped rather than
   * reaching `.trim()`. Narrow for the compiler, verify at runtime.
   */
  const imageUrlOf = (entry: string | { url?: string }): string | undefined =>
    typeof entry === "string" ? entry : entry?.url;

  const images = [
    ...(product.mainImage ? [product.mainImage] : []),
    ...(product.images || []),
  ]
    .map((img) => absoluteUrl(imageUrlOf(img)))
    .filter((img): img is string => Boolean(img))
    .filter((img, i, arr) => arr.indexOf(img) === i);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    url,
    image: images.length > 0 ? images : undefined,
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || getDefaultCurrency(),
      availability:
        (product as any).isSold === true
          ? "https://schema.org/SoldOut"
          : (product as any).availableQuantity === 0
            ? "https://schema.org/OutOfStock"
            : product.status === ProductStatusValues.PUBLISHED || !product.status
              ? "https://schema.org/InStock"
              : "https://schema.org/Discontinued",
      url,
      seller: product.sellerName
        ? { "@type": "Organization", name: product.sellerName }
        : undefined,
    },
    // Google requires ratingValue AND a positive reviewCount; a zero-count
    // AggregateRating is invalid and suppresses the whole rich result, so omit
    // the key entirely rather than emitting an empty one.
    aggregateRating:
      product.rating && product.rating.count > 0 && product.rating.average > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.average,
            reviewCount: product.rating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

export function reviewJsonLd(
  review: ReviewJsonLdInput,
): Record<string, JsonLdValue> {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    reviewBody: review.comment,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: { "@type": "Person", name: review.authorName },
    datePublished: review.createdAt.toISOString(),
    ...(review.productTitle && {
      itemReviewed: { "@type": "Product", name: review.productTitle },
    }),
  };
}

export function aggregateRatingJsonLd(
  product: Pick<ProductJsonLdInput, "title" | "slug">,
  stats: { average: number; count: number },
): Record<string, JsonLdValue> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url: `${SITE_URL}/products/${product.slug}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: stats.average,
      reviewCount: stats.count,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

export function breadcrumbJsonLd(
  items: BreadcrumbJsonLdItem[],
): Record<string, JsonLdValue> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      /*
       * `item` is OMITTED rather than emitted empty when there is no url.
       * `item: ""` would resolve to the site root, so every page's final crumb
       * would link to the homepage — a wrong link is worse than an absent one,
       * and absent is what the spec asks for on the current page.
       */
      ...(item.url
        ? { item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}` }
        : {}),
    })),
  };
}

export function faqJsonLd(faqs: FaqJsonLdInput[]): Record<string, JsonLdValue> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function blogPostJsonLd(
  post: BlogPostJsonLdInput,
): Record<string, JsonLdValue> {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    url,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified:
      post.updatedAt?.toISOString() || post.publishedAt?.toISOString(),
    author: post.authorName
      ? { "@type": "Person", name: post.authorName, image: post.authorAvatar }
      : undefined,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

/**
 * Site-identity options for the two site-wide nodes.
 *
 * These used to read `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` directly,
 * with fallbacks of `"App"` and `""`. Two live consequences:
 *
 *  - Production had `NEXT_PUBLIC_SITE_NAME="Letitrip"` — the wrong casing, which
 *    CLAUDE.md's brand rule explicitly forbids — so every page emitted
 *    `Organization.name: "Letitrip"`, the string Google may show in a Knowledge
 *    Panel. A brand name should not be settable by a mis-typed env var.
 *  - With the env unset the nodes emit `name: "App"` and `url: ""`, which is a
 *    valid-looking but wrong entity rather than a visible failure.
 *
 * Callers pass their real config (the consumer has `SEO_CONFIG.siteName` /
 * `.siteUrl` from appkit.config.js, the single canonical host definition). The
 * env values remain as a fallback so existing callers keep working.
 */
export interface SiteIdentityOptions {
  siteName?: string;
  siteUrl?: string;
  /** Real social/profile URLs — feeds schema.org `sameAs`, which drives entity recognition. */
  sameAs?: readonly string[];
  /**
   * The LEGAL entity behind the brand, for `Organization`.
   *
   * Distinct from `siteName`: "LetItRip" is what the site calls itself,
   * "Let It Rip India" is what issues the invoice. schema.org has separate
   * `name` and `legalName` for exactly this, and an Indian e-commerce site is
   * required to publish the latter.
   *
   * Every field is optional and an unset one is OMITTED rather than emitted
   * empty — a `legalName: ""` or a `PostalAddress` of blanks is a wrong entity
   * asserted confidently, which is worse for entity recognition than saying
   * nothing (the same reasoning as `sameAs: []` above).
   */
  legalName?: string;
  /** 15-character GSTIN — emitted as schema.org `taxID`. */
  taxId?: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
}

export function organizationJsonLd(opts?: SiteIdentityOptions): Record<string, JsonLdValue> {
  const name = opts?.siteName?.trim() || SITE_NAME;
  const base = (opts?.siteUrl?.trim() || SITE_URL).replace(/\/+$/, "");
  // `sameAs: []` was hardcoded empty while appkit.config.js carried real
  // socialUrls that nothing read. An empty array is worse than omitting the key.
  const sameAs = (opts?.sameAs ?? []).filter(Boolean);

  /*
   * Emit a PostalAddress only when at least one part of it is known. A node of
   * empty strings validates, reads as a real address to a consumer, and is
   * wrong — the same reason `sameAs: []` is omitted rather than sent empty.
   */
  const a = opts?.address;
  const hasAddress = Boolean(
    a && (a.streetAddress || a.addressLocality || a.postalCode || a.addressCountry),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    // Omitted when it equals `name` — repeating the brand as the legal name
    // asserts they are the same entity, which for a sole proprietorship
    // trading under a brand is not true.
    legalName:
      opts?.legalName && opts.legalName.trim() && opts.legalName.trim() !== name
        ? opts.legalName.trim()
        : undefined,
    taxID: opts?.taxId?.trim() || undefined,
    telephone: opts?.telephone?.trim() || undefined,
    email: opts?.email?.trim() || undefined,
    address: hasAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: a?.streetAddress || undefined,
          addressLocality: a?.addressLocality || undefined,
          addressRegion: a?.addressRegion || undefined,
          postalCode: a?.postalCode || undefined,
          addressCountry: a?.addressCountry || undefined,
        }
      : undefined,
    url: base || undefined,
    logo: absoluteUrl("/icons/icon-512x512.png", base),
    sameAs: sameAs.length > 0 ? [...sameAs] : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: absoluteUrl(ROUTES.PUBLIC.CONTACT, base),
      telephone: opts?.telephone?.trim() || undefined,
      email: opts?.email?.trim() || undefined,
    },
  };
}

export function searchBoxJsonLd(opts?: SiteIdentityOptions): Record<string, JsonLdValue> {
  const name = opts?.siteName?.trim() || SITE_NAME;
  const base = (opts?.siteUrl?.trim() || SITE_URL).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: base || undefined,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function auctionJsonLd(
  auction: ProductJsonLdInput,
): Record<string, JsonLdValue> {
  // An auction lives at /auctions/{slug} — see `detailPath`'s note.
  const url = `${SITE_URL}${auction.detailPath ?? `/auctions/${auction.slug}`}`;
  const base = productJsonLd(auction);
  return {
    ...base,
    "@type": ["Product", "Offer"],
    url,
    ...(auction.auctionEndDate && {
      availabilityEnds: auction.auctionEndDate.toISOString(),
    }),
  };
}

// ── D4: collection pages and item lists ─────────────────────────────────────

export interface ItemListJsonLdEntry {
  name: string;
  /** Path or absolute URL. Absolutised against the ONE canonical host. */
  url: string;
  image?: string;
}

/**
 * `ItemList` — the names and URLs of what a listing page shows.
 *
 * 🛑 NO `offers`, NO price, and this is not a style choice.
 *
 * Two independent reasons, and either alone settles it. Prices are hidden from
 * signed-out visitors and Googlebot crawls signed out, so a price here would be
 * markup the user cannot see — the mismatch `gatedPriceWebPageJsonLd` exists to
 * declare, except there is nothing to declare on a list because the list never
 * shows a price at all. And `audit-guest-price-leak` R3 blocks it outright.
 *
 * It is also exactly what hobbykartindia.com does — server-side `ItemList`
 * carrying price — and §2 records it as the thing not to copy.
 *
 * A list of names and URLs is still worth emitting: it tells a crawler what the
 * page is a list OF, which is the one thing a grid of cards does not say in
 * markup.
 */
export function itemListJsonLd(
  entries: readonly ItemListJsonLdEntry[],
): Record<string, JsonLdValue> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.name,
      url: absoluteUrl(e.url),
      ...(e.image ? { image: absoluteUrl(e.image) } : {}),
    })),
  };
}

export interface CollectionPageJsonLdInput {
  name: string;
  /** Path or absolute URL for this collection. */
  url: string;
  description?: string;
  /**
   * The items shown, if any. Omitted or empty emits a `CollectionPage` with no
   * `mainEntity` — which is correct for a collection whose contents are
   * paginated or filtered, and far better than an `ItemList` of zero claiming
   * the collection is empty.
   */
  items?: readonly ItemListJsonLdEntry[];
  /**
   * Total across all pages, when it differs from `items.length`.
   *
   * 🛑 `truncated` matters here for the same reason it does in the list
   * envelope: a `CollectionPage` on page 1 of 12 that declares
   * `numberOfItems: 24` is telling a crawler the collection has 24 items. Pass
   * the real total and the markup stops lying about scale.
   */
  totalItems?: number;
}

/**
 * `CollectionPage` — what a category, brand or listing index actually is.
 *
 * 🛑 The category tab page emitted NO JSON-LD whatsoever (verified: zero
 * `ld+json` under `features/categories/`), while worldhobbyshop — the SEO
 * leader of the fifteen crawled — ships a 6-level `BreadcrumbList` and a
 * `CollectionPage`, and no Shopify competitor has either. §5 ranks this the
 * highest-impact SEO change in the plan, and it costs nothing at render: the
 * route is already dynamic SSR and `ancestors[]` rides a read it already does.
 *
 * Pair it with `breadcrumbJsonLd` — the two answer different questions ("what
 * is this page" and "where does it sit"), and the breadcrumb is the half the
 * competition does not have.
 */
export function collectionPageJsonLd(
  input: CollectionPageJsonLdInput,
): Record<string, JsonLdValue> {
  const items = input.items ?? [];
  const total = input.totalItems ?? items.length;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    url: absoluteUrl(input.url),
    ...(input.description ? { description: input.description } : {}),
    /*
     * `mainEntity` is omitted entirely for an empty collection rather than
     * emitted as an `ItemList` of zero. "This page lists things, and here are
     * none of them" is a claim; saying nothing is not.
     */
    ...(items.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: total,
            itemListElement: items.map((e, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: e.name,
              url: absoluteUrl(e.url),
            })),
          },
        }
      : {}),
  };
}
