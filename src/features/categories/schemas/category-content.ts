/**
 * Category-owned content — description templates and product defaults.
 *
 * ## Why this lives on the CATEGORY and not on a listing template
 *
 * `ListingTemplateDocument` is store-scoped. The ask is that the description
 * lives with the *category*, and the crawl proves the model: worldhobbyshop
 * reuses TWO bodies across 1,195 listings, and tcgindia generates five
 * templated FAQs per product. Nobody writes 1,195 descriptions by hand — our
 * sellers do, because no category→description mechanism exists anywhere in
 * this codebase.
 *
 * ## Why it costs ZERO extra reads
 *
 * Both hot paths already hold the category document: `deriveTaxonomy` does
 * `cats.doc(leaf).get()`, and `CategoryDetailPageView` does `getCategoryBySlug`
 * plus seven parallel reads — already at Rule #6's ~3-round-trip ceiling. A
 * sidecar collection would add an eighth read to the second-most-crawled page
 * on the site.
 *
 * ## Why three fields rather than one blob
 *
 * Each has exactly one reader: `contentBody` → the category page;
 * `descriptionTemplates` → the seller form plus the narrow template endpoint;
 * `productDefaults` → `deriveTaxonomy`. A single `content` object would make
 * every one of those read the other two.
 */

import type { ProductAuthenticity } from "../../products/schemas/firestore";

/**
 * Which condition a template is written for.
 *
 * 🛑 A KEYED SET, not one body, because worldhobbyshop demonstrably reuses
 * **two** per category — a pre-owned body and a new-in-box body — and a single
 * string field cannot express that. The variants are the conditions that
 * change what the copy must SAY, not every `CONDITION_OPTIONS` value: a
 * "pre-owned" and a "used" listing want the same disclosure paragraph.
 */
export type CategoryTemplateVariant =
  | "default"
  | "new_in_box"
  | "new_in_packet"
  | "pre_owned"
  | "replica";

export interface CategoryDescriptionTemplate {
  id: string;
  /** What the picker shows, e.g. "Pre-owned — condition as pictured". */
  label: string;
  variant: CategoryTemplateVariant;
  /** `{{placeholder}}` slots; HTML permitted, rendered via RichTextRenderer. */
  body: string;
  /**
   * Slot names found in `body`, derived at write time as a convenience.
   *
   * 🛑 ABSENT means "re-parse", never "this body has no slots". A reader that
   * treats `undefined` as an empty list will skip interpolation entirely on
   * every template written before this field existed — and the failure is a
   * published description containing a literal `{{series}}`, which is the most
   * visible way this feature can break. Use `extractPlaceholders(body)` when
   * it is absent.
   */
  placeholders?: string[];
  /**
   * An admin has published a real listing from this template.
   *
   * Exists because of raikages, the crawl's counter-example: 114-char bodies
   * lifted from the Beyblade Wiki, one of which ships with the literal UI
   * string "Add to Wishlist Add to Wishlist" welded into the product body. An
   * unreviewed template is how that happens, so the flag records review rather
   * than assuming it.
   */
  isTested?: boolean;
  version?: number;
}

/** A spec row as the product page renders it. */
export interface CategorySpecification {
  name: string;
  value: string;
  unit?: string;
}

/**
 * What a category hands down to a product filed under it.
 *
 * Three behaviours, and the distinction matters more than the field list:
 *
 *   WRITTEN      tax, specifications, inTheBox, features — written server-side
 *                by `deriveTaxonomy` when the product omits them.
 *   FILL-BLANK   seo* — fills only an empty field, never overwrites.
 *   ADVISORY     priceGuidance — NEVER written to `price`. It renders as a hint
 *                beside the price input and nothing else.
 */
export interface CategoryProductDefaults {
  // ── tax: a REFERENCE, resolved to a SNAPSHOT on the product ─────────────
  /**
   * Points at a `taxCodes` row. `deriveTaxonomy` resolves it and writes
   * `gstRate`/`hsnCode` onto the product; the order item then snapshots from
   * the product. That layering is what stops a tax-code edit retroactively
   * re-rating an invoice already issued.
   */
  taxCodeId?: string;

  // ── content ─────────────────────────────────────────────────────────────
  specifications?: CategorySpecification[];
  /**
   * Feature ids merged onto the product, never replacing what it already has.
   * (The old `defaultTags` name went with `ProductDocument.tags`.)
   */
  defaultFeatures?: string[];
  defaultCondition?: string;
  defaultAuthenticity?: ProductAuthenticity;
  /** "What's in the box?" — becomes `ProductDocument.features[]` prose. */
  inTheBox?: string[];

  // ── pricing: ADVISORY ───────────────────────────────────────────────────
  priceGuidance?: CategoryPriceGuidance;

  // ── SEO: `{{placeholder}}` templates, fill only a BLANK field ───────────
  seoTitleTemplate?: string;
  seoDescriptionTemplate?: string;
  /** Merged with whatever the product already has. */
  seoKeywords?: string[];

  // ── fulfilment ──────────────────────────────────────────────────────────
  /*
   * 🛑 Shipping COST is deliberately NOT here. It is per-store, via
   * `resolveShippingCost(storeId)`. A second source of truth for a CHARGED
   * amount is Root Cause #75's shape exactly — and that root cause was about
   * a money rule that existed in six places, two of which had never learned
   * about `lockedPrice` and so charged the list price for a negotiated sale.
   */
  weightG?: number;
  dimensionsCm?: { l: number; w: number; h: number };
  shippingPaidBy?: string;
  fragile?: boolean;

  // ── per-listing FAQ templates → rendered AND emitted as faqJsonLd ───────
  /**
   * Rendered at READ time, so fixing a wrong answer fixes every listing at
   * once. The tcgindia model — five per product, three interpolating the
   * name — and nobody else in the crawl of fifteen does it.
   */
  faqTemplates?: { question: string; answer: string }[];
}

/**
 * Two price views, never blended.
 *
 * 🛑 `market` and `sold` are rendered SIDE BY SIDE — "Market ₹799–₹1,499 ·
 * Sold here ₹850–₹1,200 (7 sales)" — and the gap between them is the most
 * useful thing we can tell a seller, given 76–93% of competitor listings never
 * sell at their ask. Averaging the two would launder an inference into a
 * measurement.
 */
export interface CategoryPriceGuidance {
  currency: "INR";
  /**
   * Day-1 baseline from the competitor crawl: a TYPICAL MARKET LISTING PRICE.
   *
   * 🛑 NOT evidence of a transaction. A competitor's sold-out row proves the
   * item is GONE, not that it sold at that price. Seed-owned — the rollup job
   * must never write here, or a quiet night would erase the baseline.
   */
  market?: {
    /**
     * The one figure every measured band has. Required for exactly that
     * reason — a band with no central value is not a band.
     */
    median: number;
    /**
     * 🛑 OPTIONAL, and that is load-bearing. The crawl recorded quartiles for
     * parts, launchers, TCG and figures and only a MEDIAN AND A RANGE for Hot
     * Wheels (n=7,418, ₹99–36,500). Requiring p25/p75 would have forced a
     * range to be retyped as quartiles, which is a different statistic
     * presented as the one the field is named after. Absent means "not
     * measured", and the hint renders as "around ₹850" rather than a span.
     */
    p25?: number;
    p75?: number;
    /**
     * 🛑 Also optional, for the same reason: the crawl's Beyblade-top table
     * carries no per-leaf sample size at all, and the one place two sources
     * disagreed (HMS: beybladeshopindia n=39 against worldhobbyshop n=2) is
     * recorded precisely because an n=2 median is a coin flip presented as
     * data. Absent must render as absent — never as a confident figure, and
     * never as a number somebody filled in to satisfy the type.
     */
    sampleSize?: number;
    asOf: Date;
    soldOutShare?: number;
    /**
     * Which crawl this came from, and any caveat about it — "worldhobbyshop",
     * "raikages n=68 (the only component-level pricing anywhere)",
     * "toycollectorsindia 1:64 POOLED across mainline and premium".
     *
     * Carried so the question "where did this number come from" is answerable
     * from the data rather than from a markdown file nobody has open, and so a
     * source-priority decision can be applied without re-deriving the bands.
     */
    source?: string;
  };
  /**
   * OUR completed sales only, including won auctions and accepted offers.
   *
   * Absent until there are some — **never zeroed**. A zero would render as a
   * real figure meaning "things sell here for ₹0", which is worse than silence.
   */
  sold?: {
    min: number;
    median: number;
    max: number;
    sampleSize: number;
    windowDays: number;
    byPath?: { standard?: number; auction?: number; offer?: number };
  };
  lastSold?: {
    amount: number;
    at: Date;
    via?: "standard" | "auction" | "offer";
  };
}
