/**
 * LISTING TYPES — one row per variant, and the row is the only difference.
 *
 * Owner, 2026-11-08: *"if I have multiple listing types, they differ by the
 * seed config only, not by the code — as the code says all mechanisms work on
 * all listings."*
 *
 * So every row below carries the SAME keys. A type is:
 *
 *   key + label + slug + enabled + a value for every mechanism + rule-set
 *   selections + which template it renders with + its required fields.
 *
 * Nothing here is special-cased anywhere. Renaming `art-and-stickers` is an
 * edit to one `label` string — the change that previously cost 10+ file edits
 * and a redeployment.
 *
 * ## Reading the flags
 *
 * `mechanisms` must contain **every** id in `MECHANISM_IDS`. A missing key is a
 * config error rather than an implied `false`, because an implied false cannot
 * be told apart from an oversight.
 *
 * ## Rule sets, not inline rules
 *
 * `ruleSets` points at shared rows in `rule-sets-seed-data.ts`. Editing
 * "India domestic" tax once updates every type that selected it — which is the
 * difference between config and copy-paste.
 *
 * Mocks: `mocks/12-admin-settings.qm` *Listing type editor*,
 *        `mocks/06-detail-pages.qm` *Type variants*,
 *        `mocks/10-forms.qm` *Listing form*.
 */

import { MECHANISM_IDS } from "./mechanisms-seed-data";

export interface ListingTypeDefinition {
  /** Stable address. Never renamed, never reused after retirement. */
  key: string;
  /** Content. Rename freely — no migration, no deploy. */
  label: string;
  /** URL segment. Changing it is a redirect, not a rename. */
  slug: string;
  /** OFF means: renders nowhere, no facet, no sort option, no search result. */
  enabled: boolean;
  /** Order in pickers and facet lists. */
  order: number;
  /** One boolean per mechanism id. No gaps. */
  mechanisms: Record<string, boolean>;
  /** Shared rule sets this type selects. */
  ruleSets: {
    payment: string;
    shipping: string;
    tax: string;
    offers: string | null;
    coins: string | null;
  };
  /** Widget template keys this type renders with (see widget-templates-seed-data). */
  templates: { card: string; detail: string; form: string };
  /**
   * Fields the form will not publish without. A required field may be hidden
   * ONLY if a default is supplied — enforced in the editor, not in review.
   */
  requiredFields: string[];
  /** Auto-generated tags start from these; A7c adds more from the source. */
  tags: string[];
}

/** Every mechanism off — rows below switch on only what they need. */
const allOff = (): Record<string, boolean> =>
  Object.fromEntries(MECHANISM_IDS.map(id => [id, false]));

const type = (
  t: Omit<ListingTypeDefinition, "mechanisms"> & { on: string[] },
): ListingTypeDefinition => {
  const { on, ...rest } = t;
  const mechanisms = allOff();
  for (const id of on) {
    if (!(id in mechanisms)) {
      throw new Error(`listing type "${t.key}" enables unknown mechanism "${id}"`);
    }
    mechanisms[id] = true;
  }
  return { ...rest, mechanisms };
};

export const listingTypesSeedData: ListingTypeDefinition[] = [
  type({
    key: "standard",
    label: "Standard",
    slug: "standard",
    enabled: true,
    order: 1,
    on: [
      "addToCart", "buyNow", "physicalShipping", "returnsAllowed",
      "coinsEarn", "coinsRedeem", "mediaGallery", "specTable",
    ],
    ruleSets: { payment: "payment-default", shipping: "shipping-standard", tax: "tax-india-domestic", offers: null, coins: "coins-default" },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "condition", "category", "price", "media"],
    tags: ["standard"],
  }),

  type({
    key: "clearance",
    label: "Clearance",
    slug: "clearance",
    enabled: true,
    order: 2,
    // No returns and no coins: the lot is discounted and random, and the risk
    // banner that comes with `reveal` is a required element on the card.
    on: [
      "addToCart", "buyNow", "physicalShipping", "discountPricing",
      "reveal", "cancelLockedByReveal", "mediaGallery",
    ],
    ruleSets: { payment: "payment-no-cod", shipping: "shipping-standard", tax: "tax-india-domestic", offers: null, coins: null },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "category", "price", "lotSize", "revealMode", "riskDisclosure"],
    tags: ["clearance", "reveal"],
  }),

  type({
    key: "pre-order",
    label: "Pre-order",
    slug: "pre-order",
    enabled: true,
    order: 3,
    on: [
      "addToCart", "buyNow", "physicalShipping", "preOrderWindow",
      "returnsAllowed", "coinsEarn", "coinsRedeem", "mediaGallery", "specTable",
    ],
    ruleSets: { payment: "payment-no-cod", shipping: "shipping-standard", tax: "tax-india-domestic", offers: null, coins: "coins-default" },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "category", "price", "releaseWindow", "chargePoint"],
    tags: ["pre-order"],
  }),

  type({
    key: "collector",
    label: "Collector",
    slug: "collector",
    enabled: true,
    order: 4,
    // Offers are the buying path here, so autoAward and the buyout cap come with
    // them; returns are off because the item is sold as described.
    on: [
      "addToCart", "offers", "autoAward", "buyoutCap", "physicalShipping",
      "authenticityProof", "coinsEarn", "coinsRedeem", "mediaGallery", "specTable",
    ],
    ruleSets: { payment: "payment-no-cod", shipping: "shipping-insured", tax: "tax-india-domestic", offers: "offers-collector", coins: "coins-default" },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "condition", "category", "price", "authenticity", "media"],
    tags: ["collector", "offers"],
  }),

  type({
    key: "digital-code",
    label: "Digital code",
    slug: "digital-code",
    enabled: true,
    order: 5,
    // Earns coins but cannot be bought with them: a fungible pool item paid for
    // in coins is the cheapest possible fraud loop.
    on: ["addToCart", "buyNow", "instantFulfilment", "codePool", "coinsEarn"],
    ruleSets: { payment: "payment-no-cod", shipping: "shipping-none", tax: "tax-india-domestic", offers: null, coins: "coins-earn-only" },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "category", "price", "codePool"],
    tags: ["digital-code", "instant"],
  }),

  type({
    key: "art-and-stickers",
    label: "Art & stickers",
    slug: "art-and-stickers",
    enabled: true,
    order: 6,
    on: [
      "addToCart", "buyNow", "physicalShipping", "returnsAllowed",
      "coinsEarn", "coinsRedeem", "mediaGallery",
    ],
    ruleSets: { payment: "payment-default", shipping: "shipping-light", tax: "tax-india-domestic", offers: null, coins: "coins-default" },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "category", "price", "media"],
    tags: ["art", "stickers"],
  }),

  type({
    key: "spares",
    label: "Spares",
    slug: "spares",
    enabled: true,
    order: 7,
    on: [
      "addToCart", "buyNow", "physicalShipping", "partCompatibility",
      "returnsAllowed", "coinsEarn", "coinsRedeem", "mediaGallery", "specTable",
    ],
    ruleSets: { payment: "payment-default", shipping: "shipping-light", tax: "tax-india-domestic", offers: null, coins: "coins-default" },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "condition", "category", "price", "compatibility"],
    tags: ["spares", "parts"],
  }),

  // ── Off. The rows stay so they can be switched on without reconstruction. ──
  type({
    key: "classified",
    label: "Classified",
    slug: "classified",
    enabled: false,
    order: 8,
    on: ["offers", "mediaGallery"],
    ruleSets: { payment: "payment-default", shipping: "shipping-none", tax: "tax-india-domestic", offers: "offers-default", coins: null },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "category", "price"],
    tags: ["classified"],
  }),

  type({
    key: "live",
    label: "Live",
    slug: "live",
    enabled: false,
    order: 9,
    on: [
      "addToCart", "physicalShipping", "jurisdictionCheck",
      "verifiedSellerOnly", "mediaGallery",
    ],
    ruleSets: { payment: "payment-no-cod", shipping: "shipping-standard", tax: "tax-india-domestic", offers: null, coins: null },
    templates: { card: "card.product", detail: "detail.product", form: "form.listing" },
    requiredFields: ["title", "category", "price", "jurisdiction"],
    tags: ["live"],
  }),
];

/**
 * Validates at module load, which is the point: a malformed type row fails the
 * seed rather than rendering a half-configured listing in production.
 */
for (const t of listingTypesSeedData) {
  const missing = MECHANISM_IDS.filter(id => !(id in t.mechanisms));
  if (missing.length) {
    throw new Error(`listing type "${t.key}" is missing mechanisms: ${missing.join(", ")}`);
  }
}

export const listingTypesByKey: Readonly<Record<string, ListingTypeDefinition>> =
  Object.freeze(Object.fromEntries(listingTypesSeedData.map(t => [t.key, t])));
