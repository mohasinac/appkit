/**
 * Product Features — Firestore schema
 *
 * A productFeature is a reusable badge that products opt into via product.features[].
 * Two scopes:
 *   - "platform": admin-curated, available to every store
 *   - "store":    seller-owned, scoped to one storeId, capped at MAX_STORE_CUSTOM_FEATURES
 *
 * id === slug, prefix "feature-".
 *
 * The icon field accepts either:
 *   - a name key from the appkit icon set (e.g. "truck", "badge-check", "trophy"), or
 *   - a raw SVG path-d string starting with "M " (rare; for store custom icons).
 *
 * MAX_FEATURES_PER_PRODUCT — hard cap on product.features[].length, enforced by FI5 form.
 */

export const PRODUCT_FEATURES_COLLECTION = "productFeatures" as const;
export const PRODUCT_FEATURE_PREFIX = "feature-" as const;

export const MAX_STORE_CUSTOM_FEATURES = 20;

/**
 * Hard cap on `product.features[].length`.
 *
 * 🛑 RAISED 10 → 24 (B3). Ten was sized for *badges* — a handful of
 * "Free Shipping"-style trust marks. This collection is now the platform's one
 * controlled VOCABULARY (`tags` is retired), and a single realistic listing
 * spends six before anything optional: a reproduction, new-in-box,
 * japan-import, attack-type, right-spin, limited-release bey. A TCG single
 * adds language + format + grade on top.
 *
 * 24 rather than unbounded because `features[]` is `array-contains`-indexed and
 * feeds `buildProductSearchTxt`, which truncates at 600 tokens SILENTLY — an
 * unbounded feature list would quietly evict real title/description tokens
 * from the search index.
 */
export const MAX_FEATURES_PER_PRODUCT = 24;

export type ProductFeatureScope = "platform" | "store";

export type ProductFeatureCategory =
  | "shipping"
  | "seller"
  | "condition"
  | "platform"
  | "auction"
  | "preorder"
  | "custom";

export type ProductFeatureProductType =
  | "product"
  | "auction"
  | "preorder"
  | "prize-draw"
  | "classified"
  | "digital-code"
  | "live"
  | "art"
  | "stickers"
  | "all";

/**
 * Either an appkit icon-set name key (e.g. "truck") or a raw SVG path-d string.
 * Path strings must start with "M " — see isFeatureIconPath().
 */
export type ProductFeatureIcon = string;

export function isFeatureIconPath(icon: string): boolean {
  return icon.trimStart().startsWith("M ") || icon.trimStart().startsWith("m ");
}

/**
 * The vocabulary's namespace.
 *
 * 🛑 NOT the same axis as `category` above, which groups features by the
 * SURFACE that shows them (shipping/seller/platform/auction/preorder) and is
 * what drives badge placement. `group` namespaces what a feature MEANS, and
 * drives the filter drawer: one facet section per group, rather than one flat
 * 60-value checkbox list.
 *
 * Namespacing is load-bearing because **the same word means different things
 * per vertical**: "sealed" on a TCG booster box is a factory seal, on a bey it
 * is an unopened blister; "premium" is a Hot Wheels sub-line, not a quality
 * claim. A single flat vocabulary would have to pick one meaning.
 *
 * Values derived from the measured competitor crawl — see
 * `docs/research/competitor-crawl-2026-10/vocabulary.md`, which records the
 * `n` behind each group.
 */
export type FeatureGroup =
  /** How worn / how packaged. Independent of `authenticity`. */
  | "condition"
  /** Who made it. Mirrors `ProductDocument.authenticity`; see the note there. */
  | "authenticity"
  /** Regular / limited / early / random-booster / RLC — a real price multiplier. */
  | "release"
  /** Beyblade battle type: attack · defense · stamina · balance. */
  | "type"
  /** right-spin · left-spin · dual-spin. */
  | "spin"
  /** Merchandising state: clearance, on-sale, best-seller. */
  | "commercial"
  /** Where it came from: japan-import · imported · domestic. */
  | "sourcing"
  /** Hot Wheels chase variants, incl. the India-only blister card. */
  | "chase"
  /** PSA/BGS/CGC grade. Pairs with the `sublisting` + `itemCode` axis. */
  | "grade"
  /** TCG print language. */
  | "tcg-lang"
  /** TCG product format — booster box vs single differs ~20× in price. */
  | "tcg-format"
  /** Figure scale, finish and packaging state. */
  | "figure"
  /** WBO / limited format legality. */
  | "tournament";

export const FEATURE_GROUP_VALUES = [
  "condition",
  "authenticity",
  "release",
  "type",
  "spin",
  "commercial",
  "sourcing",
  "chase",
  "grade",
  "tcg-lang",
  "tcg-format",
  "figure",
  "tournament",
] as const satisfies readonly FeatureGroup[];

/**
 * Human-facing section headings for the filter drawer, one per group.
 *
 * A `Record<FeatureGroup, string>` on purpose: a fourteenth group cannot
 * compile without a label, which is the failure mode Root Cause #61 describes
 * (ten hand-written enumerations of one union, nine of which drifted).
 */
export const FEATURE_GROUP_LABEL: Record<FeatureGroup, string> = {
  condition: "Condition",
  authenticity: "Authenticity",
  release: "Release type",
  type: "Battle type",
  spin: "Spin direction",
  commercial: "Offers",
  sourcing: "Sourcing",
  chase: "Chase & rarity",
  grade: "Grading",
  "tcg-lang": "Card language",
  "tcg-format": "Card format",
  figure: "Figure details",
  tournament: "Tournament legality",
};

export interface ProductFeatureDocument {
  id: string;
  slug: string;
  label: string;
  description?: string;
  /** Icon-set name key OR raw SVG path-d string (see isFeatureIconPath). */
  icon: ProductFeatureIcon;
  /** CSS variable token key, e.g. "--appkit-color-primary". Optional — defaults to neutral. */
  iconColor?: string;
  category: ProductFeatureCategory;
  /**
   * The vocabulary namespace — see `FeatureGroup`. Optional only so the 10
   * pre-B3 rows keep parsing; the seed sets it on every row and the admin form
   * requires it. An ungrouped feature renders in no facet section.
   */
  group?: FeatureGroup;
  scope: ProductFeatureScope;
  productTypes: ProductFeatureProductType[];
  /** Required when scope === "store". */
  storeId?: string;
  isActive: boolean;
  displayOrder: number;

  /**
   * Alternative spellings that should FIND this feature.
   *
   * Three sources, all measured — see
   * `docs/research/competitor-crawl-2026-10/counterfeit-signals.md`:
   *   · part-code pairs, so "rubber flat" finds `RF` and `RF` finds "rubber flat"
   *   · JP / romaji names
   *   · 🛑 the counterfeit seller's systematic MISSPELLINGS (`Pegasis`,
   *     `Jupitar`, `Fireblase`). A counterfeiter's trademark-evasion spelling
   *     is exactly what a real buyer mistypes, so indexing them makes our
   *     search tolerant of real typos at zero query-time cost.
   *
   * 🛑 Budgeted, not unbounded: these fold into `searchTxt`, which truncates at
   * 600 tokens SILENTLY, so an over-long alias list evicts tokens nobody chose
   * to drop.
   */
  aliases?: string[];

  /**
   * Edge-n-gram search index for this collection, so the picker can search at
   * all. 🛑 Must be built from the LABEL and `aliases`, never from the slug:
   * `feature-nib` tokenises to `feature`/`nib`, so the label "New in Box" is
   * unfindable, which is the same defect `buildProductSearchTxt` has today for
   * `features[]` (it indexes the raw ids).
   */
  searchTxt?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export type ProductFeatureCreateInput = Omit<
  ProductFeatureDocument,
  "id" | "slug" | "createdAt" | "updatedAt"
>;

export type ProductFeatureUpdateInput = Partial<
  Pick<
    ProductFeatureDocument,
    | "label"
    | "description"
    | "icon"
    | "iconColor"
    | "category"
    | "group"
    | "aliases"
    | "productTypes"
    | "isActive"
    | "displayOrder"
  >
>;

export const PRODUCT_FEATURE_SIEVE_FIELDS = {
  label: { canFilter: true, canSort: true },
  slug: { canFilter: true, canSort: false },
  scope: { canFilter: true, canSort: false },
  storeId: { canFilter: true, canSort: false },
  category: { canFilter: true, canSort: false },
  group: { canFilter: true, canSort: false },
  /*
   * The picker's search. `array-contains` on an edge-n-gram index, the same
   * shape every other searchable collection uses — a flat Checkbox grid is
   * fine for 10 rows and unusable at ~60.
   */
  searchTxt: { canFilter: true, canSort: false },
  isActive: { canFilter: true, canSort: false },
  displayOrder: { canFilter: false, canSort: true },
  createdAt: { canFilter: false, canSort: true },
} as const;
