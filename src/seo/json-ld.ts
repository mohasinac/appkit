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
function absoluteUrl(value: string | null | undefined, base: string = SITE_URL): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;
  if (!base) return undefined; // no base to resolve against — omit rather than emit a bare path
  return `${base.replace(/\/+$/, "")}/${v.replace(/^\/+/, "")}`;
}

import { ProductStatusValues } from "../features/products/schemas";
import { getDefaultCurrency } from "../core/baseline-resolver";
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
  images?: string[];
  sellerName?: string;
  category?: string;
  status?: string;
  auctionEndDate?: Date;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
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
  url: string;
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

export function productJsonLd(
  product: ProductJsonLdInput,
): Record<string, JsonLdValue> {
  const url = `${SITE_URL}/products/${product.slug}`;
  // Absolutise, then de-duplicate: `mainImage` is very often also `images[0]`,
  // which produced the same URL twice in the emitted array.
  const images = [
    ...(product.mainImage ? [product.mainImage] : []),
    ...(product.images || []),
  ]
    .map((img) => absoluteUrl(img))
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
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
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
}

export function organizationJsonLd(opts?: SiteIdentityOptions): Record<string, JsonLdValue> {
  const name = opts?.siteName?.trim() || SITE_NAME;
  const base = (opts?.siteUrl?.trim() || SITE_URL).replace(/\/+$/, "");
  // `sameAs: []` was hardcoded empty while appkit.config.js carried real
  // socialUrls that nothing read. An empty array is worse than omitting the key.
  const sameAs = (opts?.sameAs ?? []).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: base || undefined,
    logo: absoluteUrl("/icons/icon-512x512.png", base),
    sameAs: sameAs.length > 0 ? [...sameAs] : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: absoluteUrl("/contact", base),
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
  const url = `${SITE_URL}/products/${auction.slug}`;
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
