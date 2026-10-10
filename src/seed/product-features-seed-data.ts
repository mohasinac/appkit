/*
 * WHY: `productFeatures` held 10 platform badge flags while `ProductDocument.tags`
 *      held free text with no vocabulary at all — which is how `attack-type` and
 *      `attack type` coexist. B5 retires `tags` and makes this collection the ONE
 *      vocabulary, so it has to carry everything a facet needs: release type,
 *      authenticity, battle type, spin, card language, card format, grade, chase
 *      status, figure scale. Those are exactly the axes the crawl measured and
 *      that §4.4 refuses to put in the tree, because a product has one category
 *      chain and any number of features.
 * WHAT: 171 platform-scope rows, grouped by `FeatureGroup`, built by a factory —
 *       76 hand-authored from the crawl's measured vocabulary plus 95 GENERATED
 *       blader/character rows. id === slug, prefix `feature-`.
 *
 * EXPORTS:
 *   productFeaturesSeedData — ProductFeatureDocument[]
 *   PRODUCT_FEATURE_COUNT   — asserted downstream so a silent drop is loud
 *
 * ## 🛑 Three things the factory exists to prevent
 *
 * 1. **`searchTxt` is built from the LABEL and the aliases, never the slug.**
 *    `buildProductSearchTxt` used to index `features` raw, so the id
 *    `feature-free-shipping` tokenised to free/shipping and searching the
 *    LABEL "Free Shipping" worked only by coincidence — while a label like
 *    "New in Box" whose slug is `feature-nib` was unfindable entirely.
 *
 * 2. **Aliases are BUDGETED.** They fold into a 600-token array that truncates
 *    SILENTLY, so each row caps at a handful. The misspelling corpus from
 *    bladekingbeys is deliberately NOT dumped in here wholesale — a
 *    counterfeiter's trademark-evasion spellings (`Pegasis`, `Jupitar`,
 *    `Fireblase`) are what real buyers mistype, so they belong on the MODEL
 *    leaf that owns the name, not on a generic feature.
 *
 * 3. **`group` is not `category`.** `category` groups by the SURFACE that shows
 *    the badge; `group` groups by what the feature MEANS, and drives one facet
 *    section each. "Sealed" on a TCG booster box and "sealed" on a bey are the
 *    same word about different things.
 *
 * @tag domain:products
 * @tag layer:seed
 * @tag pattern:shared-literal
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type {
  FeatureGroup,
  ProductFeatureCategory,
  ProductFeatureDocument,
  ProductFeatureProductType,
} from "../features/products/schemas/product-features";
import { buildSearchTxt } from "../utils/search-txt";
import { CHARACTER_SEEDS, CHARACTER_SEED_COUNT } from "./_helpers/character-features";

const NOW = new Date("2026-05-11T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const STAMP = daysAgo(30);

interface FeatureInput {
  /** Without the `feature-` prefix. */
  slug: string;
  label: string;
  description: string;
  icon: string;
  group: FeatureGroup;
  /** The badge-placement axis, independent of `group`. */
  category: ProductFeatureCategory;
  /** Alternate spellings a buyer types. Budgeted — see note 2 above. */
  aliases?: string[];
  tone?: "primary" | "secondary" | "neutral";
  types?: ProductFeatureProductType[];
}

const TONE: Record<string, string | undefined> = {
  primary: "--appkit-color-primary",
  secondary: "--appkit-color-secondary",
  neutral: undefined,
};

function featureRow(input: FeatureInput, order: number): ProductFeatureDocument {
  const id = `feature-${input.slug}`;
  return {
    id,
    slug: id,
    label: input.label,
    description: input.description,
    icon: input.icon,
    ...(TONE[input.tone ?? "neutral"] ? { iconColor: TONE[input.tone ?? "neutral"] } : {}),
    category: input.category,
    group: input.group,
    scope: "platform",
    productTypes: input.types ?? ["all"],
    ...(input.aliases?.length ? { aliases: input.aliases } : {}),
    /*
     * 🛑 LABEL + aliases. Never the slug — see note 1. A row whose label and
     * slug diverge ("New in Box" / `feature-nib`) is precisely the case a
     * slug-derived index cannot find.
     */
    searchTxt: buildSearchTxt([input.label, ...(input.aliases ?? [])]),
    isActive: true,
    displayOrder: order,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform badges — the ORIGINAL TEN, now grouped
//
// 🛑 Their ids are unchanged on purpose. `group` was optional purely so these
// compiled before B5; leaving them ungrouped would have put them in no facet
// section, which is indistinguishable from not existing.
//
// 🛑 `feature-condition-used` is relabelled "Pre-owned" with "Used" as an
// ALIAS rather than being joined by a second `feature-pre-owned` row. The two
// words describe one state — the category description templates treat them
// identically, by design — and a second row for a synonym is how the two
// vocabularies this merge exists to collapse started in the first place.
// ─────────────────────────────────────────────────────────────────────────────
const PLATFORM: FeatureInput[] = [
  { slug: "free-shipping", label: "Free Shipping", description: "Shipping is included in the listed price.", icon: "truck", group: "commercial", category: "shipping", tone: "primary", aliases: ["Free delivery"] },
  { slug: "verified-seller", label: "Verified Seller", description: "Sold by a LetItRip verified seller — identity and address confirmed.", icon: "badge-check", group: "commercial", category: "seller", tone: "primary" },
  { slug: "accept-returns", label: "Returns Accepted", description: "Eligible for return within the platform return window.", icon: "refresh-ccw", group: "commercial", category: "platform", tone: "secondary", aliases: ["Returnable"] },
  { slug: "condition-new", label: "Brand New", description: "Factory-sealed or unopened, in original packaging.", icon: "sparkles", group: "condition", category: "condition", tone: "primary", aliases: ["New", "Unused"] },
  /*
   * 🛑 "Preowned" unhyphenated is a real alias, not a typo. `buildSearchTxt`
   * splits on punctuation, so the label "Pre-owned" indexes as `pre` + `owned`
   * and a buyer who types "preowned" as one word matches NEITHER. "Pre owned"
   * with a space would have been useless here — it tokenises identically to
   * the label it was meant to supplement.
   */
  { slug: "condition-used", label: "Pre-owned", description: "Previously owned and sold as pictured. Condition is graded on the listing.", icon: "history", group: "condition", category: "condition", aliases: ["Used", "Second-hand", "Preowned"] },
  { slug: "featured", label: "Featured", description: "Highlighted by the platform across browse and homepage surfaces.", icon: "star", group: "commercial", category: "platform", tone: "primary" },
  { slug: "promoted", label: "Promoted", description: "A paid promotion placement by the seller.", icon: "megaphone", group: "commercial", category: "platform", tone: "secondary" },
  { slug: "auction-winner-badge", label: "Auction Win", description: "Acquired by winning an auction on LetItRip.", icon: "gavel", group: "commercial", category: "auction", types: ["auction"] },
  { slug: "shipping-paid-by-seller", label: "Seller Pays Shipping", description: "The seller covers shipping on this listing.", icon: "package", group: "commercial", category: "shipping", tone: "primary", aliases: ["Seller paid shipping"] },
  { slug: "preorder-confirmed", label: "Pre-order Confirmed", description: "Stock is allocated and the release date is confirmed by the seller.", icon: "calendar-check", group: "release", category: "preorder", types: ["preorder"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// condition — the packaging and wear vocabulary, from the crawl
//
// `without-box` is worth its own row for a measured reason: hobson's 57
// "Without Box" listings have a median of ₹599 against ₹1,699 for the same
// items boxed. A ~3× spread is a facet, not a prose detail.
// ─────────────────────────────────────────────────────────────────────────────
const CONDITION: FeatureInput[] = [
  { slug: "nib", label: "New in Box", description: "Unopened in its original box, with the box intact.", icon: "box", group: "condition", category: "condition", tone: "primary", aliases: ["NIB", "Boxed", "Sealed box", "MIB"] },
  { slug: "nip", label: "New in Packet", description: "New on its original card or in its original polybag, unopened.", icon: "package-2", group: "condition", category: "condition", tone: "primary", aliases: ["NIP", "Carded", "On card", "Blister"] },
  { slug: "sealed", label: "Sealed", description: "Factory wrap intact and never opened.", icon: "shield-check", group: "condition", category: "condition", tone: "primary", aliases: ["Factory sealed", "Shrink wrapped"] },
  { slug: "mint", label: "Mint", description: "No visible wear — indistinguishable from new on inspection.", icon: "gem", group: "condition", category: "condition", tone: "primary", aliases: ["Mint condition", "As new"] },
  { slug: "loose", label: "Loose", description: "Out of its packaging, complete and functional.", icon: "puzzle", group: "condition", category: "condition", aliases: ["Unboxed", "Open"] },
  { slug: "no-box", label: "Without Box", description: "The item only — no original box or card. Priced well below a boxed example.", icon: "box-select", group: "condition", category: "condition", aliases: ["No box", "Box missing", "Item only"] },
  { slug: "incomplete", label: "Incomplete", description: "One or more original parts are missing. What is included is listed and photographed.", icon: "circle-slash", group: "condition", category: "condition", aliases: ["Missing parts", "Partial"] },
  { slug: "damaged", label: "Damaged", description: "Has a chip, crack, stripped tooth or similar structural fault, disclosed and photographed.", icon: "alert-triangle", group: "condition", category: "condition", aliases: ["Broken", "Faulty", "Cracked"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// authenticity — mirrors `ProductDocument.authenticity`
//
// 🛑 There is NO "fake" row, and that is a product decision rather than an
// omission. A lead-bearing counterfeit is not a listing state we offer; it is
// a scam report. The duplication with the enum field is the one place it is
// justified: a feature can be left off and nothing notices, and a mislabelled
// reproduction is a refund while a mislabelled counterfeit is a child handling
// leaded metal.
//
// 🛑 "Midfake" is an ALIAS on `reproduction`, not a row. It is the word the
// community actually searches — worldhobbyshop ships a top-level nav category
// literally called "MidFake Beyblades" — but it names the same state.
// ─────────────────────────────────────────────────────────────────────────────
const AUTHENTICITY: FeatureInput[] = [
  { slug: "original", label: "Original", description: "Licensed manufacture — Takara, Takara Tomy, Hasbro or a regional licensee.", icon: "shield-check", group: "authenticity", category: "condition", tone: "primary", aliases: ["Genuine", "Authentic", "Licensed"] },
  { slug: "reproduction", label: "Reproduction", description: "An unlicensed copy of an original design, carrying no manufacturer's marque. Disclosed, never described as original.", icon: "copy", group: "authenticity", category: "condition", tone: "secondary", aliases: ["Midfake", "Repro", "1st copy", "Aftermarket"] },
  { slug: "unverified", label: "Authenticity Unverified", description: "The seller has not confirmed whether this is an original or a reproduction.", icon: "help-circle", group: "authenticity", category: "condition", aliases: ["Unconfirmed", "Unknown authenticity"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// release — measured as a REAL price multiplier, not a label
//
// beybladeshopindia, n=419: Limited Releases median ₹2,499 against Regular's
// ₹1,399 — 1.8×. Early Releases run 0.6×. That is why release type has to be a
// facet the price hint can account for.
// ─────────────────────────────────────────────────────────────────────────────
const RELEASE: FeatureInput[] = [
  { slug: "regular-release", label: "Regular Release", description: "A standard retail release, generally available.", icon: "circle", group: "release", category: "platform", aliases: ["Standard release"] },
  { slug: "limited-release", label: "Limited Release", description: "A limited production run. Measured at ~1.8× a regular release's median price.", icon: "timer", group: "release", category: "platform", tone: "secondary", aliases: ["Limited edition", "Limited press", "Ltd"] },
  { slug: "early-release", label: "Early Release", description: "Released ahead of general availability, often at an event.", icon: "fast-forward", group: "release", category: "platform", aliases: ["Pre-release", "Early"] },
  { slug: "random-booster", label: "Random Booster", description: "Sold in a sealed random assortment — the specific contents were not chosen.", icon: "dices", group: "release", category: "platform", aliases: ["RB", "Blind box", "Random"] },
  { slug: "rlc", label: "Red Line Club", description: "A members-only Hot Wheels release, produced in small numbers and sold directly by Mattel.", icon: "crown", group: "release", category: "platform", tone: "secondary", aliases: ["RLC", "Red Line"] },
  { slug: "remake", label: "Remake", description: "A modern reissue of an earlier design on current hardware.", icon: "rotate-ccw", group: "release", category: "platform", aliases: ["Reissue", "Reprint", "X-Over"] },
  { slug: "promo", label: "Promotional", description: "Given away or sold at an event, a campaign or a magazine tie-in rather than at retail.", icon: "gift", group: "release", category: "platform", aliases: ["Promotional", "Event exclusive", "Prize"] },
  { slug: "store-exclusive", label: "Store Exclusive", description: "Sold only through one retailer or region.", icon: "store", group: "release", category: "platform", aliases: ["Retailer exclusive", "Regional exclusive"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// type and spin — the Beyblade axes
//
// 🛑 FOUR type values and THREE spin values, and no more. The local corpus has
// 100% Type coverage in ~90 SPELLINGS and 97% Spin in 54 — a feature slug like
// `feature-attack-hammer-variant-heavy-slow-smash` is a vocabulary that has
// already failed. The parenthetical qualifier stays product prose; only the
// leading enum word becomes a feature.
// ─────────────────────────────────────────────────────────────────────────────
const BATTLE_TYPE: FeatureInput[] = [
  { slug: "type-attack", label: "Attack Type", description: "Built to strike hard and end a battle quickly, at the cost of stamina.", icon: "swords", group: "type", category: "platform", tone: "secondary", aliases: ["Attack", "Attack-type"] },
  { slug: "type-defense", label: "Defense Type", description: "Built to absorb hits and stay in the stadium.", icon: "shield", group: "type", category: "platform", aliases: ["Defense", "Defence", "Defense-type"] },
  { slug: "type-stamina", label: "Stamina Type", description: "Built to outlast — the last top spinning wins.", icon: "battery-full", group: "type", category: "platform", aliases: ["Stamina", "Endurance", "Stamina-type"] },
  { slug: "type-balance", label: "Balance Type", description: "A compromise build, competent at attack, defense and stamina without excelling.", icon: "scale", group: "type", category: "platform", aliases: ["Balance", "Balance-type"] },
];

const SPIN: FeatureInput[] = [
  { slug: "right-spin", label: "Right Spin", description: "Spins clockwise — the standard direction for most releases.", icon: "rotate-cw", group: "spin", category: "platform", aliases: ["Right", "Clockwise", "Right-spin"] },
  { slug: "left-spin", label: "Left Spin", description: "Spins anticlockwise. Needs a left-capable or LR launcher, and disrupts a right-spin opponent on contact.", icon: "rotate-ccw", group: "spin", category: "platform", tone: "secondary", aliases: ["Left", "Anticlockwise", "Left-spin"] },
  { slug: "dual-spin", label: "Dual Spin", description: "Can be launched in either direction — the HMS standard, and rare elsewhere.", icon: "repeat", group: "spin", category: "platform", aliases: ["Dual", "Both directions", "Dual-spin"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// commercial, sourcing
// ─────────────────────────────────────────────────────────────────────────────
const COMMERCIAL: FeatureInput[] = [
  { slug: "clearance", label: "Clearance", description: "Discounted to clear. Often paired with a reproduction or damaged disclosure.", icon: "tag", group: "commercial", category: "platform", tone: "secondary", aliases: ["Sale", "Clearance sale"] },
  { slug: "on-sale", label: "On Sale", description: "Currently below the seller's usual price.", icon: "percent", group: "commercial", category: "platform", tone: "secondary", aliases: ["Discounted", "Reduced"] },
  { slug: "latest-release", label: "Latest Release", description: "From the most recent wave or set.", icon: "zap", group: "commercial", category: "platform", tone: "primary", aliases: ["New release", "Newest"] },
  { slug: "best-seller", label: "Best Seller", description: "Among the most-sold listings in its category here.", icon: "trending-up", group: "commercial", category: "platform", tone: "primary", aliases: ["Popular", "Top seller"] },
  { slug: "lot", label: "Lot", description: "Several items sold together as one listing.", icon: "layers", group: "commercial", category: "platform", aliases: ["Bundle lot", "Job lot", "Multi-pack"] },
];

const SOURCING: FeatureInput[] = [
  { slug: "japan-import", label: "Japan Import", description: "A Japanese-market release, imported. Packaging and part names are the Takara Tomy originals.", icon: "plane", group: "sourcing", category: "shipping", tone: "secondary", aliases: ["JP import", "Japanese release", "TT release"] },
  { slug: "imported", label: "Imported", description: "Imported from outside India. Customs duty was paid on entry.", icon: "globe", group: "sourcing", category: "shipping", aliases: ["Import", "Overseas"] },
  { slug: "domestic", label: "Indian Release", description: "Sold through the Indian market — no import duty in the price.", icon: "home", group: "sourcing", category: "shipping", aliases: ["India release", "Local", "Funskool"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Trading cards — language and format
//
// 🛑 Language is a FACET and not prose, because a Japanese print and an
// English print of one card are different products with different print runs,
// different pull rates and often very different prices. Measured at tcgindia:
// japanese 159, english 14, korean 12, chinese 2.
//
// 🛑 Format is a facet because the bands differ ~20× — a single is ₹350–500
// and a booster box ₹7,000–14,500 — and shoppers never cross-shop them.
// ─────────────────────────────────────────────────────────────────────────────
const TCG_LANG: FeatureInput[] = [
  { slug: "lang-japanese", label: "Japanese", description: "A Japanese-language print. Smaller print runs and generally better-regarded card stock.", icon: "languages", group: "tcg-lang", category: "platform", tone: "secondary", aliases: ["JP", "Japanese print"] },
  { slug: "lang-english", label: "English", description: "An English-language print — the largest market and the most liquid resale.", icon: "languages", group: "tcg-lang", category: "platform", aliases: ["EN", "English print"] },
  { slug: "lang-korean", label: "Korean", description: "A Korean-language print.", icon: "languages", group: "tcg-lang", category: "platform", aliases: ["KR"] },
  { slug: "lang-chinese", label: "Chinese", description: "A Simplified or Traditional Chinese print.", icon: "languages", group: "tcg-lang", category: "platform", aliases: ["CN", "Simplified Chinese"] },
];

const TCG_FORMAT: FeatureInput[] = [
  { slug: "single-card", label: "Single Card", description: "One individual card, graded on condition and rarity.", icon: "credit-card", group: "tcg-format", category: "platform", aliases: ["Single", "Singles"] },
  { slug: "booster-pack", label: "Booster Pack", description: "One sealed pack. Contents are random by design.", icon: "package", group: "tcg-format", category: "platform", aliases: ["Pack", "Booster"] },
  { slug: "booster-box", label: "Booster Box", description: "A sealed box of packs — the best per-pack price of any sealed format.", icon: "boxes", group: "tcg-format", category: "platform", tone: "primary", aliases: ["Box", "Sealed box", "Display box"] },
  { slug: "etb", label: "Elite Trainer Box", description: "Fewer packs than a booster box, plus sleeves, dice and a deck box. Better value if you want the accessories.", icon: "briefcase", group: "tcg-format", category: "platform", aliases: ["ETB", "Elite Trainer"] },
  { slug: "blister", label: "Blister Pack", description: "A small carded pack, usually with a promo card.", icon: "package-2", group: "tcg-format", category: "platform", aliases: ["Blister", "Three-pack blister"] },
  { slug: "card-bundle", label: "Bundle", description: "A small sealed pack count at the lowest entry price of the sealed formats.", icon: "layers", group: "tcg-format", category: "platform", aliases: ["Pack bundle", "Booster bundle"] },
  { slug: "collection-box", label: "Collection Box", description: "A themed sealed box with promo cards and often a figure or a pin.", icon: "archive", group: "tcg-format", category: "platform", aliases: ["Collection", "Premium collection", "Box set"] },
  { slug: "premium-set", label: "Premium Set", description: "A high-tier sealed set, usually with an exclusive card treatment.", icon: "gem", group: "tcg-format", category: "platform", tone: "secondary", aliases: ["Premium", "UPC", "Ultra premium"] },
  { slug: "starter-deck", label: "Starter Deck", description: "A ready-to-play preconstructed deck.", icon: "list-ordered", group: "tcg-format", category: "platform", aliases: ["Deck", "Structure deck", "Preconstructed"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// grade — pairs with the `sublisting` + `itemCode` axis
//
// A graded slab is not a condition claim, it is a third party's certification,
// which is exactly why a PSA 10 of a ₹500 raw card can be worth twenty times
// that. hobbykart's 15 slabs run ₹4,600–11,000 against ₹350–500 raw.
// ─────────────────────────────────────────────────────────────────────────────
const GRADE: FeatureInput[] = [
  { slug: "grade-psa-10", label: "PSA 10", description: "Graded Gem Mint by Professional Sports Authenticator — their top grade.", icon: "award", group: "grade", category: "condition", tone: "primary", aliases: ["PSA10", "Gem Mint", "PSA Gem Mint 10"] },
  { slug: "grade-psa-9", label: "PSA 9", description: "Graded Mint by PSA — one step below Gem Mint, at a materially lower price.", icon: "award", group: "grade", category: "condition", aliases: ["PSA9", "PSA Mint 9"] },
  { slug: "grade-bgs", label: "BGS Graded", description: "Graded by Beckett Grading Services, with four subgrades on the label.", icon: "award", group: "grade", category: "condition", aliases: ["Beckett", "BGS", "Black label"] },
  { slug: "grade-cgc", label: "CGC Graded", description: "Graded by Certified Guaranty Company.", icon: "award", group: "grade", category: "condition", aliases: ["CGC"] },
  { slug: "grade-raw", label: "Raw", description: "Ungraded and unslabbed. Condition is the seller's own assessment.", icon: "file", group: "grade", category: "condition", aliases: ["Ungraded", "Unslabbed", "Not graded"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// chase — Hot Wheels variants
//
// 🛑 `indian-card` is here because it is a genuinely LOCAL signal no global
// taxonomy would surface: toycollectorsindia tags 40 products
// `Hotwheelsindiancard` / `hotwheelsindian` / `Hotwheels indian`, because the
// Indian-market blister card is printed differently from the US one and
// collectors here price the two differently.
// ─────────────────────────────────────────────────────────────────────────────
const CHASE: FeatureInput[] = [
  { slug: "treasure-hunt", label: "Treasure Hunt", description: "A chase casting within a mainline wave, marked with the flame-circle logo.", icon: "search", group: "chase", category: "platform", tone: "secondary", aliases: ["TH", "Treasure Hunt", "Regular TH"] },
  { slug: "super-treasure-hunt", label: "Super Treasure Hunt", description: "The premium chase: Spectraflame paint, Real Riders rubber tyres and the TH logo. Usually one per case.", icon: "flame", group: "chase", category: "platform", tone: "primary", aliases: ["STH", "Super TH", "Super Treasure"] },
  { slug: "real-riders", label: "Real Riders", description: "Rubber tyres rather than plastic — a Premium and Super Treasure Hunt marker.", icon: "circle-dot", group: "chase", category: "platform", aliases: ["Rubber tyres", "Rubber tires", "RR"] },
  { slug: "indian-card", label: "Indian Card", description: "On the Indian-market blister card, which is printed differently from the US release and priced differently here.", icon: "map-pin", group: "chase", category: "platform", tone: "secondary", aliases: ["India card", "Indian blister", "IND card"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// figure — scale, finish, packaging
// ─────────────────────────────────────────────────────────────────────────────
const FIGURE: FeatureInput[] = [
  { slug: "scale-1-12", label: "1/12 Scale", description: "Around 15 cm — the articulated-figure standard.", icon: "ruler", group: "figure", category: "platform", aliases: ["1:12", "6 inch", "15cm"] },
  { slug: "scale-1-7", label: "1/7 Scale", description: "Around 25 cm — the most common scale-statue size.", icon: "ruler", group: "figure", category: "platform", aliases: ["1:7", "25cm"] },
  { slug: "scale-1-6", label: "1/6 Scale", description: "Around 30 cm — large display statues and the premium tier.", icon: "ruler", group: "figure", category: "platform", tone: "secondary", aliases: ["1:6", "12 inch", "30cm"] },
  { slug: "prize-figure", label: "Prize Figure", description: "Produced for Japanese arcade prize machines rather than retail. Usually unarticulated, and genuinely cheaper.", icon: "joystick", group: "figure", category: "platform", aliases: ["Arcade prize", "Banpresto prize", "Crane figure"] },
  { slug: "articulated", label: "Articulated", description: "Poseable joints rather than a fixed sculpt.", icon: "move", group: "figure", category: "platform", aliases: ["Poseable", "Action figure", "Jointed"] },
  { slug: "statue", label: "Statue", description: "A fixed-pose sculpt with no articulation.", icon: "image", group: "figure", category: "platform", aliases: ["Fixed pose", "Scale statue"] },
  { slug: "pvc", label: "PVC", description: "Moulded PVC — the standard material for anime scale figures.", icon: "droplet", group: "figure", category: "platform", aliases: ["Polyvinyl", "PVC figure"] },
  { slug: "vintage-figure", label: "Vintage", description: "From a production run that has long ended — pre-2005 for most lines.", icon: "clock", group: "figure", category: "platform", tone: "secondary", aliases: ["Retro", "Old stock", "Classic"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// tournament — legality, as DATA
//
// The Beyblade Wiki's infoboxes carry Burst{Standard,GT,Limited,Classic}
// legality flags per release, so this is a fact to record rather than a claim
// to assert per listing.
// ─────────────────────────────────────────────────────────────────────────────
const TOURNAMENT: FeatureInput[] = [
  { slug: "wbo-legal", label: "WBO Legal", description: "Permitted in World Beyblade Organization standard formats — the rules most Indian events run.", icon: "check-circle", group: "tournament", category: "platform", tone: "primary", aliases: ["WBO", "Tournament legal", "Standard format"] },
  { slug: "limited-format", label: "Limited Format", description: "Restricted or banned in limited formats, usually for being too strong.", icon: "ban", group: "tournament", category: "platform", aliases: ["Limited", "Restricted", "Banned"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// character — the clickable owner linkage, GENERATED from the corpus
//
// 95 bladers across 183 of the 216 canonical beys, from a field that is 100%
// populated but written as prose: "Tyson Granger (Tyson's 9th and final bey)".
// The normalisation is in scripts/parse-bey-corpus.mjs and the rows in
// _helpers/character-features.ts.
//
// 🛑 Generated rather than hand-listed, and these 95 are the reason the
// hand-authored blocks above stop at 76: a name typed by hand is a name that
// can be typed two ways, and this group is where that would bite hardest —
// `Tyson Granger` and `Tyson Granger (Tyson's 4th bey` were BOTH produced by
// an earlier normaliser, and a facet offering both is worse than no facet.
//
// Each row is also what a model leaf's `productDefaults.defaultFeatures`
// points at, so a seller who files a Dragoon G gets the blader without
// choosing it. That is what turns an owner from prose into a facet.
// ─────────────────────────────────────────────────────────────────────────────
const CHARACTERS: FeatureInput[] = CHARACTER_SEEDS.map((c) => ({
  slug: c.slug,
  label: c.name,
  description:
    c.beyCount > 1
      ? `${c.name}'s Beyblades — ${c.beyCount} models in the catalogue, across every generation they appear in.`
      : `${c.name}'s Beyblade.`,
  icon: "user",
  group: "character" as const,
  category: "platform" as const,
  /*
   * The FIRST NAME as an alias, because that is what people actually type —
   * "tyson", not "tyson granger" — and `buildSearchTxt` indexes edge n-grams
   * per WORD, so the full label already matches a "tyson" prefix. The alias
   * earns its place on the handful of bladers known by a single name in the
   * dub ("Tala", "Ozuma", "Lee"), where there is nothing to abbreviate and the
   * alias is skipped.
   */
  aliases: c.name.includes(" ") ? [c.name.split(" ")[0]!] : undefined,
}));

const ALL_FEATURE_INPUTS: FeatureInput[] = [
  ...PLATFORM,
  ...CONDITION,
  ...AUTHENTICITY,
  ...RELEASE,
  ...BATTLE_TYPE,
  ...SPIN,
  ...COMMERCIAL,
  ...SOURCING,
  ...TCG_LANG,
  ...TCG_FORMAT,
  ...GRADE,
  ...CHASE,
  ...FIGURE,
  ...TOURNAMENT,
  ...CHARACTERS,
];

/*
 * 🛑 A duplicate slug is FATAL. The id derives from it, so two rows at one id
 * write the first and SILENTLY overwrite it — and `appkit-seed status` cannot
 * see it, because it counts ids and the id exists either way. With 68 rows
 * authored across fourteen blocks, a collision is a realistic mistake rather
 * than a theoretical one; `pre-owned` vs `condition-used` was exactly that
 * near-miss, resolved as an alias.
 */
{
  const seen = new Set<string>();
  for (const f of ALL_FEATURE_INPUTS) {
    if (seen.has(f.slug)) throw new Error(`duplicate feature slug: feature-${f.slug}`);
    seen.add(f.slug);
  }
}

export const productFeaturesSeedData: ProductFeatureDocument[] = ALL_FEATURE_INPUTS.map(
  (f, i) => featureRow(f, (i + 1) * 10),
);

/** Asserted downstream so a silently dropped block is loud. */
/*
 * 🛑 Asserted at MODULE LOAD, because the character block is GENERATED and a
 * generated import that silently empties is the failure this cannot otherwise
 * see: 95 facet rows would vanish, every model leaf's `defaultFeatures` would
 * point at ids that do not exist, and the only symptom would be a "Blader &
 * character" section that renders nothing — which reads as "no bladers in
 * this category" rather than as a broken build.
 */
if (CHARACTERS.length !== CHARACTER_SEED_COUNT) {
  throw new Error(
    `product features: ${CHARACTERS.length} character rows built, expected ` +
      `${CHARACTER_SEED_COUNT}. Re-run node scripts/gen-category-models.mjs.`,
  );
}

export const PRODUCT_FEATURE_COUNT = ALL_FEATURE_INPUTS.length;
