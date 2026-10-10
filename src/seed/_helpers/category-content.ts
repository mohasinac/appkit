/*
 * WHY: ~382 category nodes need description templates and product defaults,
 *      and inlining them per node is 382 places a fix has to land. The crawl
 *      is the evidence that this is the right shape: worldhobbyshop reuses
 *      exactly TWO bodies across 1,195 listings, so the bodies are a small
 *      closed set and the per-category part is which set applies.
 * WHAT: The five reusable description bodies, the measured day-1 market bands,
 *       and per-vertical `productDefaults` factories. Authored ONCE.
 *
 * EXPORTS:
 *   TEMPLATES          — the five bodies, by variant
 *   templateSet        — pick a subset by variant for a category
 *   marketBand         — a measured {p25, median, p75, sampleSize, asOf} band
 *   beyDefaults / partDefaults / launcherDefaults / stadiumDefaults
 *   tcgDefaults / figureDefaults / diecastDefaults / accessoryDefaults
 *
 * 🛑 Every number in MARKET_BANDS is MEASURED, from
 *    docs/research/competitor-crawl-2026-10/price-bands.md, with its real
 *    sample size. A band with no evidence is omitted rather than guessed —
 *    a fabricated "typical price" is worse than no hint, because a seller
 *    prices against it.
 *
 * 🛑 `sold` is never seeded. It is OUR completed sales and we have none for
 *    most leaves; `priceIndexRollup` (C1) is its only writer, and it must
 *    never touch `market`.
 *
 * @tag domain:categories
 * @tag layer:seed
 * @tag pattern:shared-literal
 * @tag access:server-only
 * @tag consumers:seed/_helpers/category-forest.ts
 * @tag sideEffects:none
 */

import type {
  CategoryDescriptionTemplate,
  CategoryPriceGuidance,
  CategoryProductDefaults,
  CategorySpecification,
  CategoryTemplateVariant,
} from "../../features/categories/schemas/category-content";

/**
 * When the competitor crawl was taken. Fixed, never `new Date()` — a seed file
 * is re-executed on every `appkit-seed` invocation, so a moving timestamp makes
 * `load` non-idempotent (Root Cause #25).
 */
export const CRAWL_AS_OF = new Date("2026-10-09T00:00:00.000Z");

// ─────────────────────────────────────────────────────────────────────────────
// The five description bodies
//
// Shapes taken from the crawl; every word is ours. The counter-example is
// raikagesbeybladestore, whose 114-char bodies are lifted verbatim from the
// Beyblade Wiki and one of which ships with the literal UI string "Add to
// Wishlist Add to Wishlist" welded into the product body.
//
// 🛑 No `{{price}}` slot, deliberately. A price in free text is an ungated
//    public price that `<GatedPrice>` cannot wrap, and `audit-guest-price-leak`
//    R2 blocks it.
// ─────────────────────────────────────────────────────────────────────────────

const PRE_OWNED_BODY = `<h2>{{title}}</h2>
<p>A pre-owned {{category}} listing from the {{series}} line, sold as pictured.</p>
<h3>Important things to know</h3>
<ul>
  <li><strong>Condition:</strong> {{condition}}. The photographs are of the actual item, not a stock image.</li>
  <li><strong>What is included:</strong> only what is shown. Launchers, ripcords and stadiums are sold separately unless pictured.</li>
  <li><strong>Wear:</strong> a used {{category}} will show handling marks. Anything structural — a chip, a crack, a stripped tooth — is called out above and photographed.</li>
  <li><strong>Authenticity:</strong> stated on this listing. Reproduction parts are labelled as such and never described as original.</li>
</ul>
<p>Sold by a verified seller on {{siteName}}, with buyer protection on every order.</p>`;

const NEW_IN_BOX_BODY = `<h2>{{title}}</h2>
<p>Sealed, unopened {{category}} from the {{series}} line.</p>
<h3>Specification</h3>
<ul>
  <li><strong>Manufacturer:</strong> {{brand}}</li>
  <li><strong>Condition:</strong> {{condition}}</li>
  <li><strong>Series:</strong> {{series}}</li>
  <li><strong>System:</strong> {{system}}</li>
  <li><strong>Category:</strong> {{categoryPath}}</li>
</ul>
<h3>What is in the box?</h3>
<p>Factory contents, unopened. Where a release includes a launcher or ripcord it is listed in the specification above; where it does not, it is a top-only release.</p>
<p>Listed by a verified seller on {{siteName}}.</p>`;

const NEW_IN_PACKET_BODY = `<h2>{{title}}</h2>
<p>New {{category}} on its original card or in its original polybag — never used, packaging unopened.</p>
<ul>
  <li><strong>Manufacturer:</strong> {{brand}}</li>
  <li><strong>Condition:</strong> {{condition}}</li>
  <li><strong>Series:</strong> {{series}}</li>
</ul>
<p>Card and bag wear is normal on stock of this age and is photographed where present. The item itself is untouched.</p>`;

const REPLICA_BODY = `<h2>{{title}}</h2>
<p><strong>This is a reproduction, not an original {{brand}} release.</strong> It is listed as one deliberately, because knowing which you are buying is the point.</p>
<h3>What that means</h3>
<ul>
  <li>A reproduction is an unlicensed copy of an original design. It carries no manufacturer's marque.</li>
  <li>Build quality on reproductions varies. Weight and balance may differ from the original, which matters in competitive play.</li>
  <li>Some tournament formats permit certain reproduction parts and some do not — check your local format before buying to compete.</li>
  <li>This is <em>not</em> a counterfeit sold as genuine. If you believe a listing misrepresents a reproduction as original, report it.</li>
</ul>
<p><strong>Condition:</strong> {{condition}}. Sold as pictured.</p>`;

const DEFAULT_BODY = `<h2>{{title}}</h2>
<p>{{category}} from the {{series}} line, listed by a verified seller on {{siteName}}.</p>
<ul>
  <li><strong>Manufacturer:</strong> {{brand}}</li>
  <li><strong>Condition:</strong> {{condition}}</li>
  <li><strong>Category:</strong> {{categoryPath}}</li>
</ul>
<p>Condition and authenticity are stated on every listing. Photographs are of the actual item.</p>`;

/**
 * The five bodies, by variant.
 *
 * `placeholders` is deliberately LEFT ABSENT on all five: the field's contract
 * is that absent means "re-parse", and `extractPlaceholders(body)` is the one
 * implementation. Writing the list here by hand would be a second copy that
 * drifts the first time a body is edited — and the failure mode is a published
 * description containing a literal `{{series}}`.
 */
export const TEMPLATES: Record<CategoryTemplateVariant, CategoryDescriptionTemplate> = {
  default: {
    id: "tpl-default",
    label: "Standard — manufacturer, condition, category",
    variant: "default",
    body: DEFAULT_BODY,
    version: 1,
  },
  new_in_box: {
    id: "tpl-new-in-box",
    label: "New in box — sealed, with a specification table",
    variant: "new_in_box",
    body: NEW_IN_BOX_BODY,
    version: 1,
  },
  new_in_packet: {
    id: "tpl-new-in-packet",
    label: "New in packet — carded or bagged, unopened",
    variant: "new_in_packet",
    body: NEW_IN_PACKET_BODY,
    version: 1,
  },
  pre_owned: {
    id: "tpl-pre-owned",
    label: "Pre-owned — condition exactly as pictured",
    variant: "pre_owned",
    body: PRE_OWNED_BODY,
    version: 1,
  },
  replica: {
    id: "tpl-replica",
    label: "Reproduction — disclosed, with a what-this-means panel",
    variant: "replica",
    body: REPLICA_BODY,
    version: 1,
  },
};

/** The set a normal collectible category offers. */
export const COLLECTIBLE_TEMPLATES: CategoryDescriptionTemplate[] = [
  TEMPLATES.new_in_box,
  TEMPLATES.pre_owned,
  TEMPLATES.replica,
  TEMPLATES.default,
];

/** Parts and small accessories arrive carded or loose, not boxed. */
export const PART_TEMPLATES: CategoryDescriptionTemplate[] = [
  TEMPLATES.new_in_packet,
  TEMPLATES.pre_owned,
  TEMPLATES.replica,
  TEMPLATES.default,
];

/** Sealed-only verticals (TCG sealed product, model kits) — no repro tier. */
export const SEALED_TEMPLATES: CategoryDescriptionTemplate[] = [
  TEMPLATES.new_in_box,
  TEMPLATES.pre_owned,
  TEMPLATES.default,
];

export function templateSet(...variants: CategoryTemplateVariant[]): CategoryDescriptionTemplate[] {
  return variants.map((v) => TEMPLATES[v]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Measured market bands
// ─────────────────────────────────────────────────────────────────────────────

/** `p25`/`p75`/`n` absent means NOT MEASURED. Never filled in to look complete. */
type Band = { median: number; p25?: number; p75?: number; n?: number; src: string };

/*
 * Day-1 bands, keyed by the leaf they belong to.
 *
 * 🛑 EVERY ROW HERE TRACES TO A LINE IN
 *    docs/research/competitor-crawl-2026-10/price-bands.md. Nothing is
 *    interpolated, averaged across sources, or extrapolated from a
 *    neighbouring leaf. A leaf the crawl has no evidence for is ABSENT from
 *    this map and renders no hint at all — ten of them are, and they are
 *    listed at the bottom so their absence is a recorded decision rather than
 *    an oversight.
 *
 * 🛑 An earlier draft of this map invented a sample size for all 21 Beyblade
 *    top lines, because the type required one. The crawl's own rule is the
 *    reason that matters: *"quote `n`, because a band with n=2 is not
 *    evidence"* — so a fabricated n is not a cosmetic liberty, it is the
 *    confidence signal replaced with a guess. `sampleSize` is optional now,
 *    and these 21 rows legitimately have none.
 *
 * SOURCE PRIORITY: worldhobbyshop first wherever it has data, which is every
 * Beyblade band except HMS. HMS is beybladeshopindia at n=39 against WHS's
 * n=2, and `src` records that so the decision is reviewable rather than
 * buried. Parts pricing is raikages-only (the sole component-level source in
 * the crawl), and TCG / figures / Hot Wheels come from the sites that sell
 * them, since WHS carries none of those verticals.
 */
const MARKET_BANDS: Record<string, Band> = {
  // ── Beyblade tops, by line. WHS + beybladeshopindia; no per-leaf n ────────
  "category-original-plastic-gen": { p25: 799, median: 899, p75: 1499, src: "worldhobbyshop (plastic-3-layer)" },
  "category-original-spin-gear": { p25: 799, median: 1399, p75: 1799, src: "worldhobbyshop (spin-gear-sf)" },
  "category-original-magnacore": { p25: 999, median: 1699, p75: 1999, src: "worldhobbyshop (magna-core-v-force)" },
  // 🛑 The one row where a larger sample beat worldhobbyshop, and it is
  // recorded because the gap is enormous: beybladeshopindia n=39 against WHS
  // n=2. HMS is also the highest-value Beyblade tier on the site, so getting
  // it from a coin-flip sample would mis-anchor every HMS listing.
  "category-original-hms": { p25: 2999, median: 3999, p75: 9999, n: 39, src: "beybladeshopindia n=39 (worldhobbyshop had n=2)" },
  "category-metal-phws": { p25: 799, median: 899, p75: 999, src: "worldhobbyshop (phws-metal-system)" },
  "category-metal-fusion": { p25: 799, median: 999, p75: 1499, src: "worldhobbyshop (metal-fusion)" },
  "category-metal-masters": { p25: 1099, median: 1499, p75: 1999, src: "worldhobbyshop (metal-masters)" },
  "category-metal-fury-4d": { p25: 1799, median: 2399, p75: 2999, src: "worldhobbyshop (metal-fury-4d)" },
  "category-metal-shogun-steel": { p25: 1599, median: 2499, p75: 2999, src: "worldhobbyshop (shogun-steel-zero-g)" },
  // The crawl lists single-layer (299/299/399) and dual-layer (299/399/399)
  // separately and the taxonomy collapses them to one leaf, so the band
  // collapses with them — to the documented 299/399/399, not to a midpoint
  // somebody computed.
  "category-burst-classic": { p25: 299, median: 399, p75: 399, src: "worldhobbyshop (single-layer + dual-layer, collapsed)" },
  "category-burst-god": { p25: 599, median: 599, p75: 999, src: "worldhobbyshop (burst-god-evolution)" },
  "category-burst-cho-z": { p25: 599, median: 799, p75: 999, src: "worldhobbyshop (burst-cho-z-turbo)" },
  "category-burst-gt": { p25: 799, median: 999, p75: 1099, src: "worldhobbyshop (burst-gt-rise)" },
  "category-burst-superking": { p25: 999, median: 999, p75: 1499, src: "worldhobbyshop (burst-superking-surge)" },
  "category-burst-db": { p25: 999, median: 1399, p75: 1799, src: "worldhobbyshop (burst-db-quaddrive)" },
  "category-burst-bu": { p25: 1499, median: 1599, p75: 1799, src: "worldhobbyshop (burst-bu-quadstrike)" },
  "category-x-basic": { p25: 799, median: 999, p75: 1499, src: "worldhobbyshop (x-basic-s1)" },
  "category-x-unique-ux": { p25: 1199, median: 1399, p75: 1699, src: "worldhobbyshop (x-unique-ux)" },
  "category-x-custom-cx": { p25: 1299, median: 1499, p75: 1799, src: "worldhobbyshop (x-custom-cx)" },
  "category-x-over": { p25: 999, median: 1099, p75: 1499, src: "worldhobbyshop (x-over-remakes)" },

  // ── Parts. raikages is the ONLY component-level source in the crawl ───────
  "category-metal-energy-rings": { p25: 149, median: 199, p75: 249, n: 68, src: "raikages n=68" },
  "category-metal-fusion-wheels": { p25: 149, median: 249, p75: 299, n: 52, src: "raikages n=52" },
  "category-metal-spin-tracks": { p25: 149, median: 199, p75: 249, n: 53, src: "raikages n=53" },
  "category-metal-performance-tips": { p25: 129, median: 139, p75: 149, n: 25, src: "raikages n=25" },
  // WHS prices Burst parts as ONE pool (n=82) and X parts as one pool (n=14);
  // it does not split layers from discs from drivers. The three leaves share
  // the pooled band, and `src` says so rather than implying three measurements.
  "category-burst-layers": { p25: 99, median: 149, p75: 249, n: 82, src: "worldhobbyshop n=82, POOLED across all Burst parts" },
  "category-burst-discs": { p25: 99, median: 149, p75: 249, n: 82, src: "worldhobbyshop n=82, POOLED across all Burst parts" },
  "category-burst-drivers": { p25: 99, median: 149, p75: 249, n: 82, src: "worldhobbyshop n=82, POOLED across all Burst parts" },
  "category-x-blades": { p25: 199, median: 299, p75: 299, n: 14, src: "worldhobbyshop n=14, POOLED across all X parts" },
  "category-x-ratchets": { p25: 199, median: 299, p75: 299, n: 14, src: "worldhobbyshop n=14, POOLED across all X parts" },
  "category-x-bits": { p25: 199, median: 299, p75: 299, n: 14, src: "worldhobbyshop n=14, POOLED across all X parts" },

  // ── Launchers. One pooled band per generation, again as WHS measured it ───
  "category-original-ripcord-launchers": { p25: 199, median: 299, p75: 899, n: 32, src: "worldhobbyshop n=32, POOLED across original-era launchers" },
  "category-original-winders": { p25: 199, median: 299, p75: 899, n: 32, src: "worldhobbyshop n=32, POOLED across original-era launchers" },
  "category-metal-string-launchers": { p25: 399, median: 599, p75: 849, n: 37, src: "worldhobbyshop n=37, POOLED across Metal Fight launchers" },
  "category-metal-ripcord-launchers": { p25: 399, median: 599, p75: 849, n: 37, src: "worldhobbyshop n=37, POOLED across Metal Fight launchers" },
  "category-metal-lr-launchers": { p25: 399, median: 599, p75: 849, n: 37, src: "worldhobbyshop n=37, POOLED across Metal Fight launchers" },
  "category-burst-string-launchers": { p25: 399, median: 599, p75: 699, n: 78, src: "worldhobbyshop n=78, POOLED across Burst launchers" },
  "category-burst-lr-launchers": { p25: 399, median: 599, p75: 699, n: 78, src: "worldhobbyshop n=78, POOLED across Burst launchers" },
  "category-burst-grips": { p25: 399, median: 599, p75: 699, n: 78, src: "worldhobbyshop n=78, POOLED across Burst launchers" },
  "category-x-string-launchers": { p25: 299, median: 599, p75: 700, n: 34, src: "worldhobbyshop n=34, POOLED across X launchers" },
  "category-x-winders": { p25: 299, median: 599, p75: 700, n: 34, src: "worldhobbyshop n=34, POOLED across X launchers" },
  "category-x-grips": { p25: 299, median: 599, p75: 700, n: 34, src: "worldhobbyshop n=34, POOLED across X launchers" },

  // ── Stadiums. ONE band, EIGHT leaves ──────────────────────────────────────
  // WHS does not split stadiums by generation — its single "Stadiums & Arenas"
  // category states the split in PROSE, because WooCommerce's flat taxonomy
  // could not hold it. So there is no per-generation evidence, and inventing
  // four bands from one sample of seven would be fabrication. The leaves stay
  // split (a BX-10 Xtreme Stadium is a Beyblade X product); the band does not.
  "category-original-bakuten-arena": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-original-attack-stadium": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-metal-standard-stadiums": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-metal-zero-g-stadiums": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-burst-standard-stadiums": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-burst-stadium-variants": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-x-xtreme-stadiums": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },
  "category-x-standard-stadiums": { p25: 2000, median: 2999, p75: 3499, n: 7, src: "worldhobbyshop n=7, ALL generations pooled" },

  // ── TCG. tcgrepublic + hobbykart. WHS sells no cards ─────────────────────
  "category-pokemon-singles": { p25: 350, median: 400, p75: 500, n: 545, src: "tcgrepublic n=545 (singles, all games)" },
  "category-one-piece-singles": { p25: 350, median: 400, p75: 500, n: 545, src: "tcgrepublic n=545 (singles, all games)" },
  "category-pokemon-graded": { p25: 4600, median: 8000, p75: 11000, n: 15, src: "hobbykart n=15 (graded slabs)" },
  "category-one-piece-graded": { p25: 4600, median: 8000, p75: 11000, n: 15, src: "hobbykart n=15 (graded slabs)" },
  "category-tcg-weiss-schwarz": { p25: 3500, median: 6500, p75: 7500, n: 14, src: "tcgrepublic n=14" },
  "category-card-sleeves-toploaders": { p25: 250, median: 800, p75: 1800, n: 31, src: "tcgrepublic n=31 (supplies, pooled)" },
  "category-card-binders-boxes": { p25: 250, median: 800, p75: 1800, n: 31, src: "tcgrepublic n=31 (supplies, pooled)" },
  "category-card-slab-display": { p25: 250, median: 800, p75: 1800, n: 31, src: "tcgrepublic n=31 (supplies, pooled)" },

  // ── Figures. hobson + redeyemerch ────────────────────────────────────────
  "category-anime-scale-1-12": { p25: 3499, median: 5900, p75: 7999, n: 34, src: "hobson n=34 (1/12 scale)" },
  // The only band the crawl has for mid-scale statues is its general "Anime
  // Figures" tag, not a 1/7-or-1/8 measurement. Used, and labelled as general.
  "category-anime-scale-1-7-1-8": { p25: 1199, median: 1699, p75: 2499, n: 94, src: "redeyemerch n=94, GENERAL anime-figure band (not scale-specific)" },
  "category-anime-prize-figures": { p25: 1999, median: 2699, p75: 2999, n: 23, src: "hobson n=23 (prize figures)" },
  "category-comic-marvel-legends": { p25: 2999, median: 3999, p75: 5499, n: 41, src: "hobson n=41" },
  "category-comic-vintage-toybiz": { p25: 3499, median: 3999, p75: 4499, n: 22, src: "hobson n=22" },

  // ── Hot Wheels. toycollectorsindia ───────────────────────────────────────
  // 🛑 NO QUARTILES EXIST for either row. The crawl recorded a median and a
  // RANGE (₹99–36,500 for the pooled 1:64 band; ₹130–999 for their own plain
  // mainline collection), and a range is not a quartile. So these two carry a
  // median only, which is why `p25`/`p75` are optional at all.
  "category-hw-mainline-series": { median: 399, n: 27, src: "toycollectorsindia n=27 (their own plain mainline collection); range 130-999, no quartiles measured" },
  "category-hw-treasure-hunt": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },
  "category-hw-car-culture": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },
  "category-hw-boulevard": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },
  "category-hw-team-transport": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },
  "category-hw-fast-and-furious": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },
  "category-hw-pop-culture": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },
  "category-hw-rlc": { median: 850, n: 7418, src: "toycollectorsindia n=7418, 1:64 POOLED across mainline and premium; range 99-36500, no quartiles" },

  /*
   * 🛑 DELIBERATELY ABSENT — the crawl measured no band for these, and a
   * plausible-looking number would be worse than no hint, because a seller
   * prices against whatever we show them:
   *
   *   category-original-engine-gear   WHS bands plastic / spin-gear / magnacore
   *                                   / HMS and NOT Engine Gear. An earlier
   *                                   draft of this map invented 899/1499/1899
   *                                   for it, interpolated from its neighbours.
   *   category-metal-face-bolts       raikages prices rings, wheels, tracks and
   *   category-burst-chips-armour     tips — not face bolts, chips or armour.
   *   category-anime-scale-1-6        No 1/6 measurement. S.H.Figuarts (n=25)
   *                                   is a 1/12 line and is not a substitute.
   *   category-anime-nendoroid-chibi  No band. Good Smile's n=17 in the crawl
   *                                   is a TAG COUNT, not a price sample.
   *   category-comic-dc               No DC band at all.
   *   category-game-*                 Three leaves, no franchise-level bands.
   *   the TCG expansion-set leaves    Booster pack / box / ETB are a FORMAT
   *                                   axis (the `tcg-format` feature group),
   *                                   and a set leaf holds all of them mixed.
   *                                   No single band describes it honestly.
   *   the Gunpla grade leaves         No model-kit pricing in any of the
   *                                   fifteen crawls.
   *   category-hw-multipacks children No multipack band.
   *   the accessory leaves            No band for cases, tools or counters.
   *   the living-collectibles leaves  Not a market we crawled, and would not
   *                                   want a competitor-derived band for.
   */
};

export function marketBand(leafId: string): CategoryPriceGuidance | undefined {
  const b = MARKET_BANDS[leafId];
  if (!b) return undefined;
  return {
    currency: "INR",
    market: {
      median: b.median,
      ...(b.p25 == null ? {} : { p25: b.p25 }),
      ...(b.p75 == null ? {} : { p75: b.p75 }),
      ...(b.n == null ? {} : { sampleSize: b.n }),
      asOf: CRAWL_AS_OF,
      /*
       * Measured across the five largest competitors: 92.8 / 88.5 / 87.0 /
       * 81.1 / 76.0% of their listings are sold out. Carried so the seller
       * hint can say "this is a typical ASK, and most asks at this level do
       * not convert" rather than presenting it as a clearing price.
       */
      soldOutShare: 0.85,
      source: b.src,
    },
  };
}

/** Every leaf id this map claims a band for — the seed asserts they all exist. */
export const MARKET_BAND_LEAF_IDS: string[] = Object.keys(MARKET_BANDS);

// ─────────────────────────────────────────────────────────────────────────────
// Per-vertical productDefaults
//
// 🛑 taxCodeId, not gstRate/hsnCode. The reference is for AUTHORING; the
//    scalars are resolved onto the PRODUCT by `deriveTaxonomy` and snapshotted
//    again onto the order item. Without that layering, editing a tax code
//    would retroactively re-rate an invoice already issued.
// ─────────────────────────────────────────────────────────────────────────────

const TAX_TOY = "tax-hsn-95030020"; // non-electronic toys incl. spinning tops — 5%
const TAX_TOY_OTHER = "tax-hsn-95030099"; // other toys — 5%
const TAX_EXEMPT = "tax-exempt-0";

/** Shared across every Beyblade-family node. */
const BEY_FAQ_TEMPLATES = [
  {
    question: "Is {{title}} an original {{brand}} release?",
    answer:
      "The authenticity of every listing is stated on the listing itself — original, reproduction, or unverified. A reproduction is an unlicensed copy with no manufacturer's marque and is always labelled as one; it is not the same thing as a counterfeit sold as genuine.",
  },
  {
    question: "What condition is {{title}} in?",
    answer:
      "This listing is graded {{condition}}, and the photographs are of the actual item rather than a stock image. Structural damage — a chip, a crack, a stripped tooth — is called out in the description and photographed.",
  },
  {
    question: "Does {{title}} include a launcher?",
    answer:
      "Only if the description says so. Starter releases include a launcher and ripcord; booster releases are top-only. Where a used listing is involved, what is pictured is what ships.",
  },
  {
    question: "Can I return {{title}} if it is not as described?",
    answer:
      "Yes. A listing that misrepresents condition or authenticity is covered by buyer protection, and the return window opens from delivery. Report the listing as well as opening the return — a misdescribed reproduction is a listing problem, not just an order problem.",
  },
];

const SPEC = (name: string, value: string, unit?: string): CategorySpecification =>
  unit ? { name, value, unit } : { name, value };

/** A complete top. */
export function beyDefaults(leafId: string, series: string, system: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY,
    specifications: [SPEC("Series", series), SPEC("System", system)],
    inTheBox: ["Beyblade top", "Manual (where supplied)"],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{series}} | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a {{series}} {{category}}, from a verified seller on {{siteName}}. Condition {{condition}}, authenticity stated, buyer protection on every order.",
    seoKeywords: ["beyblade", series.toLowerCase()],
    weightG: 120,
    dimensionsCm: { l: 12, w: 10, h: 6 },
    fragile: false,
    faqTemplates: BEY_FAQ_TEMPLATES,
  };
}

/** A loose component. */
export function partDefaults(leafId: string, partKind: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY,
    specifications: [SPEC("Part type", partKind)],
    inTheBox: [`${partKind} only — no complete top`],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{category}} | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a loose {{category}} for custom builds, on {{siteName}}. Condition {{condition}}, sold as pictured.",
    seoKeywords: ["beyblade parts", partKind.toLowerCase()],
    weightG: 25,
    dimensionsCm: { l: 8, w: 6, h: 3 },
    fragile: false,
    /*
     * A part listing answers a different question from a complete top: the
     * buyer already owns a bey and wants to know whether this fits it. So the
     * first FAQ is compatibility, not authenticity — which is also the single
     * most common pre-purchase question on used-part listings.
     */
    faqTemplates: [
      {
        question: "Will {{title}} fit my Beyblade?",
        answer:
          "Parts are compatible within a generation, not across them. A {{series}} component fits other {{series}} tops; it will not fit a different generation's system, because each generation uses its own locking geometry.",
      },
      BEY_FAQ_TEMPLATES[1]!,
      BEY_FAQ_TEMPLATES[3]!,
    ],
  };
}

export function launcherDefaults(leafId: string, series: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY,
    specifications: [SPEC("Series", series), SPEC("Accessory type", "Launcher")],
    inTheBox: ["Launcher", "Ripcord or winder (where supplied)"],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{series}} launcher | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a {{series}} launcher, on {{siteName}}. Condition {{condition}}, tested where the seller states so.",
    seoKeywords: ["beyblade launcher", series.toLowerCase()],
    weightG: 90,
    dimensionsCm: { l: 16, w: 10, h: 4 },
    fragile: false,
    faqTemplates: [
      {
        question: "Which Beyblades does {{title}} launch?",
        answer:
          "A {{series}} launcher drives {{series}} tops. Launchers are not interchangeable across generations — the ripcord, the prongs and the lock all changed between them.",
      },
      {
        question: "Is the ripcord included with {{title}}?",
        answer:
          "Check the description. A ripcord is a wear part and is frequently sold separately or replaced; where one is included the listing says so and it is in the photographs.",
      },
      BEY_FAQ_TEMPLATES[1]!,
    ],
  };
}

export function stadiumDefaults(leafId: string, series: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY,
    specifications: [SPEC("Series", series), SPEC("Accessory type", "Stadium")],
    inTheBox: ["Stadium", "Assembly parts where the design requires them"],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{series}} stadium | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a {{series}} Beyblade stadium, on {{siteName}}. Condition {{condition}}, dimensions and compatibility in the description.",
    seoKeywords: ["beyblade stadium", "beystadium", series.toLowerCase()],
    /*
     * 🛑 Stadiums are the one Beyblade node where shipping actually bites — a
     * ~35 cm dish is volumetric freight, not a 120 g parcel. The weight and
     * dimensions here are what a courier rate is computed from, so getting
     * them wrong under-quotes every stadium listing.
     */
    weightG: 900,
    dimensionsCm: { l: 40, w: 40, h: 12 },
    fragile: true,
    faqTemplates: [
      {
        question: "Can I use {{title}} with every Beyblade generation?",
        answer:
          "Mostly. Round stadiums handle Original, Metal Fight and Burst play. Beyblade X's Xtreme Line stadiums add a rail feature X tops are designed around, so serious X play wants an X-format stadium rather than a round one.",
      },
      {
        question: "Does {{title}} ship assembled?",
        answer:
          "A stadium ships flat or in its original packaging wherever the design allows it, because a rigid dish is volumetric freight. Any assembly required is noted in the description.",
      },
      BEY_FAQ_TEMPLATES[1]!,
    ],
  };
}

export function tcgDefaults(leafId: string, game: string, format: string): CategoryProductDefaults {
  return {
    /*
     * Chapter 9504 (playing cards) is the likelier correct HSN for a TCG
     * single and it is deliberately NOT seeded: its current rate is
     * UNVERIFIED, and a wrong HSN on a real invoice is worse than a
     * conservative one. 9503 0099 ("other toys", 5%) is the rate the Indian
     * hobby trade actually invoices sealed product at, and it is the one
     * chapter here that was confirmed. Revisit when 9504 is verified.
     */
    taxCodeId: TAX_TOY_OTHER,
    specifications: [SPEC("Game", game), SPEC("Format", format)],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{category}} | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, {{game}} {{category}}, on {{siteName}}. Condition {{condition}}, language and print run stated on the listing.",
    seoKeywords: [game.toLowerCase(), "trading cards", format.toLowerCase()],
    weightG: format === "Sealed" ? 450 : 15,
    dimensionsCm: format === "Sealed" ? { l: 20, w: 15, h: 10 } : { l: 10, w: 7, h: 1 },
    fragile: false,
    /*
     * The tcgindia model — five templated FAQs per product, three of which
     * interpolate the name. Nobody else in the crawl of fifteen does it, and
     * it is the cheapest structured-data win available to us.
     */
    faqTemplates: [
      {
        question: "Is {{title}} authentic?",
        answer:
          "Yes. Cards and sealed product listed here come from verified sellers, and a listing that misrepresents authenticity is covered by buyer protection. Language and print run are stated because a Japanese print and an English print of the same card are different products.",
      },
      {
        question: "Is {{title}} sealed?",
        answer:
          "The listing states it. Sealed product is unopened and factory-wrapped; a single is an individual card whose condition is graded on the listing.",
      },
      {
        question: "Can I request {{title}} if it is out of stock?",
        answer:
          "Yes — add it to your wishlist and you will be notified when a seller lists it again. Sold listings stay visible here on purpose, so you can see what has been available and at what price.",
      },
      {
        question: "Are specific pulls guaranteed from {{title}}?",
        answer:
          "No. Sealed product is random by design and no seller here guarantees a particular card from a pack or box. Any listing claiming a guaranteed pull from sealed product should be reported.",
      },
      {
        question: "Can I return {{title}}?",
        answer:
          "A misdescribed card or a damaged delivery is returnable within the stated window. Opened sealed product is not returnable on the basis of what was inside it, for the reason above.",
      },
    ],
  };
}

export function figureDefaults(leafId: string, scaleOrLine: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY_OTHER,
    specifications: [SPEC("Scale / line", scaleOrLine)],
    inTheBox: ["Figure", "Stand and accessories as supplied by the maker"],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{category}} | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a {{category}} collectible figure, on {{siteName}}. Condition {{condition}}, box state stated, buyer protection on every order.",
    seoKeywords: ["collectible figure", "anime figure", scaleOrLine.toLowerCase()],
    weightG: 700,
    dimensionsCm: { l: 30, w: 20, h: 20 },
    /*
     * PVC at scale is genuinely fragile — a 1/7 figure has thin painted
     * extremities and the box is part of the value. This is the one vertical
     * where `fragile` drives packaging instructions rather than being advisory.
     */
    fragile: true,
    faqTemplates: [
      {
        question: "Is {{title}} an authentic {{brand}} figure?",
        answer:
          "Authenticity is stated on the listing. Bootleg figures are common at scale and are identified by paint quality, seam finish and box printing — a seller listing a bootleg must label it as a reproduction.",
      },
      {
        question: "What condition is the box of {{title}} in?",
        answer:
          "Box condition is called out separately from figure condition, because for a collectible figure the two are priced differently. A \"without box\" listing says so in its title.",
      },
      BEY_FAQ_TEMPLATES[3]!,
    ],
  };
}

export function diecastDefaults(leafId: string, line: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY,
    specifications: [SPEC("Line", line), SPEC("Scale", "1:64")],
    inTheBox: ["Die-cast model on its original card where carded"],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — Hot Wheels {{category}} | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a Hot Wheels {{category}} die-cast, on {{siteName}}. Card condition stated; chase variants identified on the listing.",
    seoKeywords: ["hot wheels", "diecast", "1:64", line.toLowerCase()],
    weightG: 60,
    dimensionsCm: { l: 17, w: 9, h: 4 },
    fragile: false,
    faqTemplates: [
      {
        question: "Is {{title}} a Treasure Hunt?",
        answer:
          "Chase variants are identified on the listing itself, not inferred. A Treasure Hunt carries the flame circle logo; a Super Treasure Hunt additionally has Real Riders rubber tyres and Spectraflame paint. A listing that claims a chase without showing it should be reported.",
      },
      {
        question: "Is the card for {{title}} in good condition?",
        answer:
          "Card condition is graded separately from the car, because carded collectors price it separately. Creases, bends and blister clouding are photographed where present.",
      },
      {
        question: "Is {{title}} an Indian-card release?",
        answer:
          "Where it is, the listing says so. The Indian-market blister card differs from the US one and collectors here price the two differently, so it is called out rather than left for the buyer to spot.",
      },
    ],
  };
}

export function accessoryDefaults(leafId: string, kind: string): CategoryProductDefaults {
  return {
    taxCodeId: TAX_TOY_OTHER,
    specifications: [SPEC("Accessory type", kind)],
    defaultAuthenticity: "unverified",
    priceGuidance: marketBand(leafId),
    seoTitleTemplate: "{{title}} — {{category}} | {{siteName}}",
    seoDescriptionTemplate:
      "Buy {{title}}, a {{category}}, on {{siteName}}. Condition {{condition}}, capacity and dimensions in the description.",
    seoKeywords: [kind.toLowerCase(), "collectible accessories"],
    weightG: 400,
    dimensionsCm: { l: 28, w: 20, h: 8 },
    fragile: false,
    faqTemplates: [
      {
        question: "What fits in {{title}}?",
        answer:
          "Capacity is in the description. Storage designed for complete tops and storage designed for loose parts are different products, and the listing states which this is.",
      },
      BEY_FAQ_TEMPLATES[1]!,
    ],
  };
}

/** Live animals and plants — exempt, and nothing about them is a toy. */
export function livingDefaults(): CategoryProductDefaults {
  return {
    taxCodeId: TAX_EXEMPT,
    defaultAuthenticity: "original",
    seoTitleTemplate: "{{title}} — {{category}} | {{siteName}}",
    seoDescriptionTemplate:
      "{{title}}, a {{category}} listing from a verified seller on {{siteName}}. Species, age and provenance disclosed; jurisdiction checked before payment.",
    fragile: true,
    faqTemplates: [
      {
        question: "Can {{title}} be shipped to me?",
        answer:
          "The jurisdiction check runs at checkout, before payment rather than after. Most live listings are local-collection only and the listing states the collection area; where courier transport is lawful and appropriate the seller arranges a specialist live service.",
      },
      {
        question: "What welfare information comes with {{title}}?",
        answer:
          "Species, age, sex where known, and provenance are recorded on the listing, and a seller must be verified before any live listing goes public.",
      },
    ],
  };
}
