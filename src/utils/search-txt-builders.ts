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
import { aliasVariantsForName } from "../_internal/shared/search/alias-variants";
import { partAliasTokens } from "../_internal/shared/search/part-aliases";
import { physicalLocationTokens } from "./physical-location";
import type { ProductDocument } from "../features/products/schemas/firestore";
import type { CategoryDocument } from "../features/categories/schemas/firestore";
import type { ScammerDocument } from "../features/scams/schemas/firestore";
import type { StoreDocument } from "../features/stores/schemas/firestore";
import type { EventDocument } from "../features/events/schemas/firestore";
import type { BlogPostDocument } from "../features/blog/schemas/firestore";
import type { ReviewDocument } from "../features/reviews/schemas/firestore";
import type { OrderDocument } from "../features/orders/schemas/firestore";
import type { BidDocument } from "../features/auctions/schemas/firestore";
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
    /*
     * D2 Fix 3 — the PART CODE ⇄ NAME bridge, so "rubber flat" finds a listing
     * titled "Storm Pegasus 105RF" and `RF` finds one titled "… Rubber Flat".
     *
     * Firestore cannot fuzzy-match, but nothing stops us indexing MORE tokens
     * per document — which is the whole mechanism, and it costs nothing at
     * query time because `searchTxt` is already `array-contains`-indexed.
     *
     * 🛑 Fed the TITLE and the specs only, not `description`. A 300-word body
     * mentioning a dozen parts would add a dozen aliases and push real tokens
     * off the 600 cap — the same reasoning the misspelling generator records
     * for itself, and the cap TRUNCATES SILENTLY.
     *
     * Emitted BEFORE the misspelling variants: a glossary alias is evidence
     * from the corpus, a generated misspelling is a guess, so the guess is what
     * should be dropped first if anything is.
     */
    partAliasTokens([
      p.title ?? "",
      ...(p.specifications ?? []).map((sp) => `${sp.name} ${sp.value}`),
    ].join(" ")),
    /*
     * The warehouse location — C4, and this one line is what makes the hard
     * direction work.
     *
     * "Where is item X" was already answerable from the Location column.
     * "What is in bin A-3" had **no mechanism at all**: `physicalLocation` was
     * absent from the products Sieve config, from `PRODUCT_INDEXED_FIELDS`,
     * from the seller search field list and from this builder — so a seller
     * could set a location and then never query it.
     *
     * 🛑 Indexed as TOKENS rather than queried as a field. A
     * `physicalLocation.bin == "3"` clause needs its own composite index per
     * sort field, and the `FAILED_PRECONDITION` would be swallowed into an
     * empty page (Root Cause #59). `searchTxt` is already
     * `array-contains`-indexed, so this is more tokens in an existing index
     * and **no new index** — and it gives both directions through the one
     * search box the seller already uses.
     *
     * See `physicalLocationTokens` for how the match really happens: the
     * query tokeniser applies the same normaliser as the index, so the PARTS
     * AND-refine and the separators are irrelevant on both sides.
     */
    physicalLocationTokens(p.physicalLocation),
    /*
     * Misspelling variants of the TITLE only — last, so they are what the
     * 600-token cap drops first.
     *
     * 🛑 Title only, not `description`. A 300-word body would generate
     * hundreds of variants and push the real tokens off the end, making exact
     * search worse to make misspelled search better. The title is what buyers
     * mistype; prose is what they read.
     */
    aliasVariantsForName(p.title ?? ""),
  ]);
}

/**
 * categories — name, slug, path, ancestor names, item code, editorial copy.
 *
 * Covers brand and bundle rows too, since they share the collection: hence
 * `brandCountry` and `itemCode`, which only one kind ever carries.
 *
 * 🛑 `ancestors[].name` is in here deliberately, and it is what makes a leaf
 * findable by its lineage — typing "burst" reaches `category-lost-longinus`
 * because Beyblade Burst is one of its ancestors. Without it, the only way to
 * find a tier-4 model is to already know its exact name.
 *
 * `description` is stripped of HTML because `contentBody`-style copy is
 * keyword-rich markup and the tags are not search terms.
 *
 * NOT indexed: `createdBy` (a raw uid), `createdByStoreName` (operator
 * identity), `position`/`subtreeSize` (internal coordinates), and the
 * `metrics` counters (numbers nobody searches by).
 */
export function buildCategorySearchTxt(c: Partial<CategoryDocument>): string[] {
  return buildSearchTxt([
    c.name,
    c.slug,
    stripHtml(c.description),
    c.path,
    c.itemCode,
    c.brandCountry,
    ...(c.ancestors ?? []).map((a) => a.name),
    /*
     * B5 — LAST on purpose. `buildSearchTxt` truncates at 600 tokens and does
     * it silently, so whatever sits at the end of this array is what gets
     * dropped first. A model leaf's own name and its lineage must survive
     * ahead of "also known as" spellings.
     */
    ...(c.aliases ?? []),
    /*
     * Mechanical misspelling variants, after the authored aliases for the same
     * truncation reason: a human-written alias is evidence, a generated one is
     * a guess, and the guess is what should fall off the end first.
     *
     * 🛑 This is what makes "dragon g" find "Dragoon G". Measured against the
     * built helper: `buildSearchTxt(["Dragoon G"])` yields
     * `dragoon d dr dra drag drago dragoo g`, and "dragon" is in that set
     * NOWHERE — it is not a prefix of "dragoon", the two diverge at the sixth
     * character. Prefix n-grams cannot reach it; an alias can.
     *
     * Generated from the NAME and the authored aliases only — deliberately not
     * from `description` or `path`, which would spend the token budget varying
     * prose nobody searches by spelling.
     */
    ...aliasVariantsForName([c.name, ...(c.aliases ?? [])].filter(Boolean).join(" ")),
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

/**
 * reviews — title, comment, productTitle. `userName` is PII and excluded.
 *
 * Typed to the three fields it READS, like the offer builder. The exclusion of
 * `userName` is the privacy property this depends on, and naming only the
 * non-PII fields in the signature is what proves it — and what lets the
 * function take the ciphertext document and the plaintext seed shape alike
 * without a cast.
 */
export function buildReviewSearchTxt(
  r: Partial<Pick<ReviewDocument, "title" | "comment" | "productTitle">>,
): string[] {
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
    /*
     * The pick/pack location — C4, same mechanism as the product side.
     *
     * `OrderDocument` carries `physicalLocation` too (it is where the parcel
     * is staged), and the seller bulk-sets it from the orders list. Without
     * this a seller could file an order to a bin and then not search for it,
     * which is the same half-built state the product side was in.
     */
    physicalLocationTokens(o.physicalLocation),
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
/*
 * Typed to the three fields it READS, not to the whole document.
 *
 * All three are non-PII, which is the privacy property this builder depends
 * on — and stating it in the signature is what makes the function accept the
 * ciphertext document and the plaintext seed shape alike without a cast.
 * `buyerName`/`buyerEmail` are deliberately absent; see the note above.
 */
export function buildOfferSearchTxt(
  o: Partial<Pick<OfferDocument, "productTitle" | "productSlug" | "storeName">>,
): string[] {
  return buildSearchTxt([o.productTitle, o.productSlug, o.storeName]);
}

/**
 * The scam registry's identity fields are stored PLAINTEXT on purpose — a
 * victim googles a UPI ID before paying, so SEO is the feature (see the field
 * comments on ScammerDocument). Indexing them is therefore aligned with the
 * feature rather than a PII risk, and it is why this collection can have a
 * partial-match box where users/reviews/payouts cannot.
 *
 * `description` is the reporter's narrative and is NOT indexed: it is free
 * text naming victims and third parties, and the 600-token cap would let one
 * long report crowd out every identity token in the same document.
 */
export function buildScammerSearchTxt(s: Partial<ScammerDocument>): string[] {
  return buildSearchTxt([
    s.displayNames ?? [],
    s.phones ?? [],
    s.upiIds ?? [],
    s.emails ?? [],
    s.scamType,
  ]);
}

/**
 * bids — what a buyer or a seller actually looks a bid up BY.
 *
 * `productTitle` is what a buyer searching their own bids means ("which
 * auction was that?"); `userName` is what a seller scanning bids on their
 * listing means ("has Ravi bid?").
 *
 * 🛑 `userEmail` is ABSENT. It is the single entry in `BID_PII_FIELDS`, and a
 * plaintext token index over an encrypted field IS that field in the clear
 * (decision D1) — the same reason `buildOrderSearchTxt` omits `userName`,
 * `userEmail` and `sellerEmail` there. `userName` differs here only because
 * bids do not register it as PII and it already ships in `BID_PUBLIC_FIELDS`,
 * so indexing it discloses nothing the public bid history does not.
 */
export function buildBidSearchTxt(b: Partial<BidDocument>): string[] {
  return buildSearchTxt([b.productTitle, b.userName]);
}
