/*
 * WHY: One definition per collection of "which fields feed searchTxt".
 *
 *      There were THREE copies of the products derivation — the repository's
 *      `buildProductSearchTxt` (12 sources), the seed wrapper
 *      `withProductSearchTxt` (9), and `backfill-search-txt.mjs` (9) — and two
 *      of them were missing the same three fields. Nothing could catch it:
 *      each copy is valid TypeScript producing a valid token array, and a
 *      document indexed under fewer tokens is not an error, just unfindable by
 *      the terms nobody derived.
 *
 *      This module is the write-path definition. The repository calls it, the
 *      seed wrapper calls it, and `backfill-search-txt.mjs` MIRRORS it — the
 *      script must keep its own copy because it has to run against a checkout
 *      whose appkit/dist is stale, so `audit-search-parity` cross-checks the
 *      two rather than trusting them to agree.
 *
 * WHAT: Pure functions, document-shape in, token-array out. No Firestore, no
 *       repository, no seed import — so every layer can share them without
 *       dragging firebase-admin into a bundle that must not have it.
 *
 * 🛑 NEVER feed PII in here. `searchTxt` stores readable fragments of the source
 *    text, so indexing an encrypted field would undo the encryption (D1).
 *    `reviews.userName` is encrypted and is deliberately absent below.
 *
 * @tag domain:search
 * @tag layer:util
 * @tag access:isomorphic
 */

import { buildSearchTxt } from "./search-txt";
import type { ProductDocument } from "../features/products/schemas/firestore";
import type { StoreDocument } from "../features/stores/schemas/firestore";
import type { EventDocument } from "../features/events/schemas/firestore";
import type { BlogPostDocument } from "../features/blog/schemas/firestore";
import type { ReviewDocument } from "../features/reviews/schemas/firestore";
import type { OrderDocument } from "../features/orders/schemas/firestore";
import type { CouponDocument } from "../features/promotions/schemas/firestore";
import type { OfferDocument } from "../features/seller/schemas/firestore";

const stripHtml = (s: string | undefined | null): string =>
  (s ?? "").replace(/<[^>]+>/g, " ");

/** products — title, description, brand, taxonomy, condition, card/grading, specs. */
export function buildProductSearchTxt(p: Partial<ProductDocument>): string[] {
  return buildSearchTxt([
    p.title,
    p.description,
    p.brand,
    p.brandSlug,
    p.categoryNames,
    p.tags,
    p.features,
    p.condition,
    p.card?.setName,
    p.card?.cardNumber,
    p.grading?.service,
    p.specifications?.map((s) => `${s.name} ${s.value}`),
  ]);
}

/** stores — name, description, category. No payout details, no contact. */
export function buildStoreSearchTxt(s: Partial<StoreDocument>): string[] {
  return buildSearchTxt([
    s.storeName,
    stripHtml(s.storeDescription),
    s.storeCategory,
  ]);
}

/** events — title, description, type, tags. */
export function buildEventSearchTxt(e: Partial<EventDocument>): string[] {
  return buildSearchTxt([
    e.title,
    stripHtml(e.description),
    e.type,
    e.tags ?? [],
  ]);
}

/**
 * blogPosts — title, excerpt, category, tags.
 *
 * The full `content` body is deliberately EXCLUDED. FAQ answers are short
 * (measured: max 449 tokens against a 600 cap), but blog bodies are an order of
 * magnitude larger and would blow it — at which point `buildSearchTxt`
 * truncates SILENTLY and the tail of every post becomes unsearchable with no
 * error anywhere. The excerpt is the searchable summary.
 */
export function buildBlogSearchTxt(b: Partial<BlogPostDocument>): string[] {
  return buildSearchTxt([
    b.title,
    stripHtml(b.excerpt),
    b.category,
    b.tags ?? [],
  ]);
}

/** reviews — title, comment, productTitle. `userName` is PII and excluded. */
export function buildReviewSearchTxt(r: Partial<ReviewDocument>): string[] {
  return buildSearchTxt([r.title, stripHtml(r.comment), r.productTitle]);
}

/**
 * orders — what an admin or seller actually looks an order up BY: the product,
 * the store, the tracking number.
 *
 * 🛑 `userName`, `userEmail` and `sellerEmail` are ORDER_PII_FIELDS and are
 * absent. `shippingAddress` is absent too — it is not in that registry, but it
 * is an address, and a searchTxt for an address IS that address re-encoded.
 * Indexing any of them would undo the encryption they are stored under (D1).
 */
export function buildOrderSearchTxt(o: Partial<OrderDocument>): string[] {
  return buildSearchTxt([
    o.productTitle,
    o.storeName,
    o.trackingNumber,
    (o.items ?? []).map((i) => i.productTitle),
  ]);
}

/** coupons — code, name, description. Nothing here is PII. */
export function buildCouponSearchTxt(c: Partial<CouponDocument>): string[] {
  return buildSearchTxt([c.code, c.name, c.description]);
}

/**
 * offers — the product and the store the negotiation is about.
 *
 * 🛑 `buyerName`, `buyerEmail` and `sellerName` are OFFER_PII_FIELDS and are
 * absent. `sellerNote` is free text a seller wrote to one buyer; it is not in
 * the PII registry, but it is private correspondence and has no business being
 * findable by substring from an admin list.
 */
export function buildOfferSearchTxt(o: Partial<OfferDocument>): string[] {
  return buildSearchTxt([o.productTitle, o.productSlug, o.storeName]);
}
