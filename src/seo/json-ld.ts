/**
 * JSON-LD Structured Data Helpers
 *
 * Generates Schema.org JSON-LD objects for rich search results.
 *
 * @example
 * ```tsx
 * import { productJsonLd } from "./";
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
 * />
 * ```
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "App";

import { ProductStatusValues } from "../features/products/schemas";
import { getDefaultCurrency } from "../core/baseline-resolver";

// ─── Input Types ──────────────────────────────────────────────────────────────

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
  isAuction?: boolean;
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

export interface BreadcrumbItem {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function productJsonLd(
  product: ProductJsonLdInput,
): Record<string, unknown> {
  const url = `${SITE_URL}/products/${product.slug}`;
  const images = [
    ...(product.mainImage ? [product.mainImage] : []),
    ...(product.images || []),
  ];

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
        product.status === ProductStatusValues.PUBLISHED || !product.status
          ? "https://schema.org/InStock"
          : product.status === ProductStatusValues.OUT_OF_STOCK
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/Discontinued",
      url,
      seller: product.sellerName
        ? { "@type": "Organization", name: product.sellerName }
        : undefined,
    },
  };
}

export function reviewJsonLd(
  review: ReviewJsonLdInput,
): Record<string, unknown> {
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
): Record<string, unknown> {
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
  items: BreadcrumbItem[],
): Record<string, unknown> {
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

export function faqJsonLd(faqs: FaqJsonLdInput[]): Record<string, unknown> {
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
): Record<string, unknown> {
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

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512x512.png`,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
    },
  };
}

export function searchBoxJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function auctionJsonLd(
  auction: ProductJsonLdInput,
): Record<string, unknown> {
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
