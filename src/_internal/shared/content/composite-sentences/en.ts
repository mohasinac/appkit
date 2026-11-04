/**
 * English composite sentences — found by
 * `scripts/find-composite-listing-sentences.mjs` against `messages/en.json`
 * (5 genuine composites out of 74 candidates; the other 69 were single-topic
 * prose on pages/sections already wholly about one listing type, which
 * belongs to route/section-level gating, not fragment-level omission —
 * CLAUDE.md's own "Listing Types Reference" / `hidden-surfaces.ts` already
 * cover that case).
 *
 * A `Record<CompositeSentenceId, CompositeSentence>`, NOT `Partial` — a
 * locale file missing one id is a compile error, same discipline
 * `ALL_LISTING_TYPES_MAP` already uses (Root Cause #61).
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */
import type { CompositeSentence } from "./registry";

/**
 * 🛑 `cancellationPolicy.sections.3.body` is deliberately NOT here. It is 3
 * already-complete paragraphs, not one compound sentence — forcing it through
 * this resolver's Oxford-comma `joinList` would read badly (a stray comma
 * between two full paragraphs). It needs `resolveFragmentedAnswer` (the
 * paragraph-concatenation resolver `fragments.ts` already built for admin
 * prose) applied to STATIC copy instead, which this phase's static-copy half
 * doesn't yet have a locale-file home for — tracked as a Phase 12 follow-up,
 * not hacked into the wrong shape here.
 */
export type CompositeSentenceId =
  | "homepage.howItWorksStep2Desc"
  | "search.metaDescription"
  | "helpPage.topicCollectorDropsDesc"
  | "cancellationPolicy.sections.3.heading"
  | "sellPage.listingStepDesc"
  | "sellPage.everyKindOfListingDesc";

export const SENTENCES_EN: Record<CompositeSentenceId, CompositeSentence> = {
  "homepage.howItWorksStep2Desc": {
    id: "homepage.howItWorksStep2Desc",
    lead: "Buy at a fixed price with secure checkout",
    clauses: [
      {
        governs: { governs: "listingType", value: "pre-order" },
        text: "reserve an upcoming release with a pre-order",
      },
    ],
  },
  "search.metaDescription": {
    id: "search.metaDescription",
    lead: "Search for products",
    clauses: [
      {
        governs: { governs: "listingType", value: "collector-drop" },
        text: "collector drops",
      },
      {
        governs: { governs: "listingType", value: "pre-order" },
        text: "pre-orders",
      },
    ],
    conjunction: "and",
    // `{{siteName}}`, not a literal — appkit is a library, and a hardcoded
    // brand name inside `_internal/` is exactly what `audit-ssr-in-appkit`/
    // `audit-appkit-brand-leak` exist to block. `getCompositeSentence()`
    // (`./index.ts`) pipes the resolved string through `withBrand()` as its
    // final step, same "fragment-filter, then token-substitute" two-pass
    // shape already used for FAQ answers.
    terminator: " and more on {{siteName}}.",
  },
  "helpPage.topicCollectorDropsDesc": {
    id: "helpPage.topicCollectorDropsDesc",
    lead: "How bidding works",
    clauses: [
      {
        governs: { governs: "listingType", value: "collector-drop" },
        text: "winning a collector drop",
      },
      {
        governs: { governs: "listingType", value: "pre-order" },
        text: "what pre-orders involve",
      },
    ],
    conjunction: "and",
  },
  "cancellationPolicy.sections.3.heading": {
    id: "cancellationPolicy.sections.3.heading",
    lead: "Cancellation terms",
    clauses: [
      { governs: { governs: "listingType", value: "collector-drop" }, text: "Collector Drops" },
      { governs: { governs: "listingType", value: "pre-order" }, text: "pre-orders" },
      { governs: { governs: "listingType", value: "random-lots" }, text: "prize draws" },
    ],
    conjunction: "and",
    leadSeparator: ": ",
    terminator: "",
  },
  /*
   * /sell — step 3's body sentence ("Add items with photos and a price.
   * Sell outright, run a collector drop, take pre-orders, or list spare
   * parts — whatever fits the item."). Found as a real Fact-1 gap
   * (page-foundation-coverage, 2026-11-04): this sentence was a hardcoded
   * TS literal in the page file, so `find-composite-listing-sentences.mjs`
   * (which only scans `messages/en.json`) never saw it — disabling a type
   * via the admin toggle would leave the page claiming it's still supported.
   */
  "sellPage.listingStepDesc": {
    id: "sellPage.listingStepDesc",
    lead: "Sell outright",
    clauses: [
      { governs: { governs: "listingType", value: "collector-drop" }, text: "run a collector drop" },
      { governs: { governs: "listingType", value: "pre-order" }, text: "take pre-orders" },
      { governs: { governs: "listingType", value: "spares" }, text: "list spare parts" },
    ],
    conjunction: "or",
    terminator: " — whatever fits the item.",
  },
  /*
   * /sell — the "Every kind of listing" benefit body. Same Fact-1 gap class
   * as above, same page.
   */
  "sellPage.everyKindOfListingDesc": {
    id: "sellPage.everyKindOfListingDesc",
    lead: "Fixed price",
    clauses: [
      { governs: { governs: "listingType", value: "collector-drop" }, text: "collector drops" },
      { governs: { governs: "listingType", value: "pre-order" }, text: "pre-orders" },
      { governs: { governs: "listingType", value: "random-lots" }, text: "prize draws" },
      { governs: { governs: "listingType", value: "spares" }, text: "spare parts" },
      { governs: { governs: "listingType", value: "art" }, text: "art" },
      { governs: { governs: "listingType", value: "stickers" }, text: "sticker sheets" },
    ],
    conjunction: "and",
    terminator: " — all supported, each with the right chrome.",
  },
};
