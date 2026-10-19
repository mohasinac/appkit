/*
 * WHY: The realised-price tool looks prices up per CATEGORY leaf, but the thing
 *      a person searches for is a model, a part, a brand or an era — four
 *      different index types with four different href shapes. Turning a search
 *      hit into "the leaf whose band answers this" was previously a single
 *      regex over `/categories/...` inside the view, which silently dropped
 *      every part hit; the tool asked the index for `["model", "category"]`
 *      only, so spares were unreachable even though `part` is indexed.
 * WHAT: One pure function from a search hit to the category id to look up, plus
 *       the type list the tool should ask the matcher for.
 *
 * EXPORTS:
 *   PRICE_LOOKUP_INDEX_TYPES — which index types the tool searches
 *   priceLookupTargetFor     — a hit's href -> the category id, or null
 *
 * 🛑 Pure. No React, no Firestore, no fetch — it runs inside a `loadOptions`
 *    callback on every keystroke.
 *
 * @tag domain:price-index
 * @tag layer:feature
 * @tag pattern:pure-function
 * @tag access:isomorphic
 * @tag consumers:PriceIndexToolView
 * @tag sideEffects:none
 */

import { PART_SLOT_CATEGORY, type PartSlot } from "../parts/schemas/firestore";

/**
 * The index types the price tool searches.
 *
 * 🛑 Exactly the types that can RESOLVE TO A PRICEABLE NODE, which is a
 * narrower set than "everything in the index" and deliberately so:
 *
 *   `model`    -> its model leaf (href is `/categories/{categoryId}`)
 *   `category` -> itself, incl. the era and part-group leaves the crawl
 *                 actually measured
 *   `part`     -> its part-group leaf via `PART_SLOT_CATEGORY` — this is the
 *                 one that makes spares work, and those leaves
 *                 (`category-metal-energy-rings`, `category-burst-layers`, …)
 *                 are precisely where `MARKET_BANDS` has component pricing
 *   `brand`    -> itself; brands are `categories` rows with
 *                 `categoryType: "brand"`
 *
 * 🛑 What is NOT here, and why — each of these was asked for and cannot be
 * delivered from the client index as it stands:
 *
 *   `group`           `groupedListings` is not a category, so no band can
 *                     attach to it at all.
 *   the 10 listing    A product record's href is `/products/{slug}` and the
 *   types             record carries no `categoryId`, so resolving one needs a
 *                     server read per hit. A price band is a statement about a
 *                     leaf, not about one seller's listing.
 *   `bundle`,         NOT IN THE INDEX. No `IndexSource` emits them and the
 *   `franchise`       `category` source rejects any `categoryType` other than
 *                     `sublisting`, so adding them is an index-build change,
 *                     not a filter here.
 *
 * 🛑 `brand` is included as asked, and the honest caveat is that a brand row is
 * a tier-0 node OUTSIDE the forest with no `parentIds`, so it inherits no band
 * and will usually resolve to "no market evidence". That renders as an honest
 * empty rather than a wrong number, but it is a thin result and the reason is
 * the data, not the lookup.
 */
export const PRICE_LOOKUP_INDEX_TYPES: readonly string[] = [
  "model",
  "category",
  "part",
  "brand",
];

/** `/categories/{id}` and `/brands/{id}` — category documents are pure slugs. */
const DIRECT_CATEGORY_HREF = /^\/(?:categories|brands)\/([^/?#]+)/;

/**
 * `/parts/{classification}/{code}`.
 *
 * 🛑 TWO segments, and the first is the slot. `ROUTES.PUBLIC.PART_DETAIL`'s own
 * comment explains why a code alone cannot be a URL: "`105` is a Metal Fight
 * spin-track height, a bare number in Burst is a disc, and `1-60` is a Beyblade
 * X ratchet." The slot is what places the part in the taxonomy.
 */
const PART_HREF = /^\/parts\/([^/?#]+)\/([^/?#]+)/;

/**
 * The category id whose band answers a search hit, or `null` when the hit
 * cannot be priced.
 *
 * 🛑 `null` is a real answer and must not be collapsed into a guess. The
 * alternative — falling back to some ancestor, or to the hit's own slug as if
 * it were a category id — would attach a band to a node that does not have one
 * and render a confident number for the wrong thing. A dropped option is
 * visible; a misattributed price is not.
 */
export function priceLookupTargetFor(href: string): string | null {
  const direct = DIRECT_CATEGORY_HREF.exec(href);
  if (direct) return direct[1] ?? null;

  const part = PART_HREF.exec(href);
  if (part) {
    const slot = part[1] as PartSlot;
    /*
     * `PART_SLOT_CATEGORY` is a `Record<PartSlot, string>`, so a 21st slot is a
     * compile error there rather than a silent miss here — but the href came
     * off an artifact built from live documents, so a slot this build has never
     * heard of is still possible and resolves to `null` rather than
     * `undefined` leaking into a URL.
     */
    return PART_SLOT_CATEGORY[slot] ?? null;
  }

  return null;
}
