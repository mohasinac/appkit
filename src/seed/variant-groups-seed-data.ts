/**
 * VARIANT GROUPS, BUNDLES and GROUPED LISTINGS — three different things that
 * look similar and must not be collapsed into one.
 *
 * Owner, 2026-11-08, with screenshots of the live site: a listing headed
 * *"PHW Scorpio WD145B"* showing **Select An Option: #1 #2 #3 #4** — four
 * thumbnails, each a DIFFERENT physical unit with its own SKU (`G26V-92`,
 * `J26A-48`, `J26A-44`) and its own *"1 in stock"*. And the cross-seller case:
 * *"farm a, b and c deliver eggs, but farm a at 80, farm b at 90 and farm c at
 * 70 — the product is same but from different farms"*, plus *"farm c only sells
 * grass-fed eggs so they are at 120"*.
 *
 * ## The three shapes
 *
 * | | What the buyer picks | What they pay for | Stock |
 * |---|---|---|---|
 * | **Variant group** | ONE of several interchangeable alternatives | the member they picked | per member |
 * | **Bundle** | nothing — it is one product | the bundle price | the bundle's own |
 * | **Grouped listing** | nothing — all items move together | the group total | all-or-nothing |
 *
 * A variant group is the only one of the three where the members are separately
 * buyable and belong to **different sellers**. That is what makes it a
 * marketplace rather than a catalogue.
 *
 * ## The model: one CATALOGUE PRODUCT, many LISTINGS
 *
 * The group is anchored on a catalogue product (the wiki entity), and listings
 * reference it. The group itself has no price, no stock and no seller — it is a
 * view over its members. This is what lets farm A, B and C each hold their own
 * listing while a buyer sees one page.
 *
 * ## 🛑 What must stay per member, always
 *
 * price · stock · condition · SKU · SELLER · shipping origin. Origin is the one
 * that bites: it changes the shipping rate AND the tax country pair, so a
 * variant group that averages or inherits it produces a wrong price.
 *
 * Mocks: `mocks/06-detail-pages.qm`, `mocks/07-cart-checkout.qm` (the cart is
 * already grouped by seller, which is exactly what a cross-seller variant
 * group needs downstream).
 */

/** What distinguishes members from each other. Drives the selector UI. */
export type VariantAxisKind =
  | "unit"       // distinct physical items, otherwise identical (the Scorpio case)
  | "attribute"  // colour, size, config — a real product attribute
  | "condition"  // new / used-good / used-fair
  | "seller"     // same product, different vendor (the eggs case)
  | "grade";     // a quality tier the seller declares (grass-fed, first-run)

export interface VariantAxis {
  id: string;
  label: string;
  kind: VariantAxisKind;
  /** How the buyer picks along this axis. */
  selector: "thumbnails" | "swatches" | "dropdown" | "table" | "chips";
  /**
   * True when every member must declare a value. False allows a member to be
   * "not applicable" on this axis — which the selector renders as "any".
   */
  requiredOnMember: boolean;
}

export const variantAxesSeedData: VariantAxis[] = [
  { id: "unit", label: "Option", kind: "unit", selector: "thumbnails", requiredOnMember: true },
  { id: "colour", label: "Colour", kind: "attribute", selector: "swatches", requiredOnMember: true },
  { id: "size", label: "Size", kind: "attribute", selector: "chips", requiredOnMember: true },
  { id: "condition", label: "Condition", kind: "condition", selector: "chips", requiredOnMember: true },
  { id: "seller", label: "Sold by", kind: "seller", selector: "table", requiredOnMember: true },
  { id: "grade", label: "Grade", kind: "grade", selector: "chips", requiredOnMember: false },
];

export interface VariantGroupRules {
  /**
   * `shared` — one group spanning several sellers (the eggs case).
   * `single-seller` — every member belongs to one store (the Scorpio case).
   */
  scope: "shared" | "single-seller";
  /** Headline price. `from` is the only honest one when members differ. */
  priceDisplay: "from" | "range" | "selected-only";
  /** The group shows available when ANY member has stock. */
  availability: "any-member-in-stock";
  /**
   * Which member is selected when the page opens with no parameter.
   * `cheapest-available` is the default because it matches what the headline
   * "from ₹X" just promised — anything else makes the price appear to jump.
   */
  defaultSelection: "cheapest-available" | "best-rated-seller" | "first-listed";
  /**
   * REQUIRED on every option in a shared group. A buyer who cannot see which
   * farm they are buying from is being misled by the grouping itself.
   */
  sellerVisibleOnEveryOption: boolean;
  /** Who may attach a listing to an existing shared group. */
  attachPolicy: "seller-proposes-admin-approves" | "seller-self-serve" | "admin-only";
  /** One canonical URL for the group; member selection is a parameter. */
  canonical: "group";
  /** Adding a member adds a line for THAT member's seller. */
  cartBehaviour: "line-per-member";
}

export interface VariantMember {
  /** The listing this member points at. Keeps its own everything. */
  listingKey: string;
  sellerKey: string;
  /** Axis id → value. Must cover every axis with `requiredOnMember`. */
  axisValues: Record<string, string>;
  /** Mirrored here only for the seed fixture; the listing is the source. */
  fixture: { sku: string; priceInr: number; stock: number; condition?: string };
}

export interface VariantGroupDefinition {
  key: string;
  label: string;
  /** The catalogue product this group is a view over. */
  catalogueProductKey: string;
  axes: string[];
  rules: VariantGroupRules;
  members: VariantMember[];
}

export const variantGroupsSeedData: VariantGroupDefinition[] = [
  /*
   * ── The owner's screenshot, modelled ────────────────────────────────────
   *
   * One title, one price, four thumbnails, four SKUs, "1 in stock" on each.
   * These are four distinct second-hand units from ONE seller, so the axis is
   * `unit` and the scope is single-seller. Condition rides along as a second
   * axis because the units are not actually identical — which is the honest
   * version of what the live site shows today.
   */
  {
    /*
     * 🛑 CORRECTED 2026-11-08 after the owner looked at the first mock: this is
     * NOT a single-seller group, and splitting it from the eggs case was the
     * mistake.
     *
     * *"Can we have them both for same? Like still see the options even from
     * different sellers, and when an option is selected from that vendor the
     * details show that vendor. In the case of the PHW Scorpio, if 1 and 2
     * options are from vendor 1 and 3 and 4 are from vendor 2 and 3, the end
     * user still sees that as a single listing on that item, but the option
     * selection shows the details for the vendor who put it. And for the 1 and
     * 2 options the conditions change — or not, maybe 2 identical as well."*
     *
     * So `unit` and `seller` are INDEPENDENT axes, and a unit group may span
     * vendors exactly as the eggs group does. Options #1 and #2 below are the
     * identical-condition pair the owner called out; #3 and #4 come from two
     * other stores at their own prices.
     */
    key: "vgroup-phw-scorpio-wd145b",
    label: "PHW Scorpio WD145B — Takara Tomy",
    catalogueProductKey: "catalogue-phw-scorpio-wd145b",
    axes: ["unit", "condition", "seller"],
    rules: {
      scope: "shared",
      priceDisplay: "from",
      availability: "any-member-in-stock",
      defaultSelection: "cheapest-available",
      // Required the moment a group spans vendors — the buyer must know who
      // they are contracting with before they pick an option.
      sellerVisibleOnEveryOption: true,
      attachPolicy: "seller-proposes-admin-approves",
      canonical: "group",
      cartBehaviour: "line-per-member",
    },
    members: [
      { listingKey: "listing-scorpio-01", sellerKey: "store-beyindia", axisValues: { unit: "#1", condition: "used-good", seller: "BeyIndia" }, fixture: { sku: "G26V-92", priceInr: 799, stock: 1, condition: "used-good" } },
      // #2 is deliberately identical in condition to #1 — same vendor, same
      // grade, a different physical unit. The selector must still show both.
      { listingKey: "listing-scorpio-02", sellerKey: "store-beyindia", axisValues: { unit: "#2", condition: "used-good", seller: "BeyIndia" }, fixture: { sku: "J26A-48", priceInr: 799, stock: 1, condition: "used-good" } },
      { listingKey: "listing-scorpio-03", sellerKey: "store-ripzone", axisValues: { unit: "#3", condition: "used-fair", seller: "RipZone" }, fixture: { sku: "J26A-44", priceInr: 749, stock: 1, condition: "used-fair" } },
      { listingKey: "listing-scorpio-04", sellerKey: "store-spinhouse", axisValues: { unit: "#4", condition: "new", seller: "SpinHouse" }, fixture: { sku: "J26A-51", priceInr: 1099, stock: 1, condition: "new" } },
    ],
  },

  /*
   * ── The eggs case, which is the one the current code cannot express ─────
   *
   * Same product, three sellers, three prices — and farm C's grass-fed line is
   * a different GRADE, not a different price for the same thing. Modelling
   * grade as an axis is what stops ₹120 looking like an outlier: the buyer is
   * choosing a different thing, and the selector says so.
   */
  {
    key: "vgroup-eggs-dozen",
    label: "Farm eggs — dozen",
    catalogueProductKey: "catalogue-eggs-dozen",
    axes: ["seller", "grade"],
    rules: {
      scope: "shared",
      priceDisplay: "from",
      availability: "any-member-in-stock",
      defaultSelection: "cheapest-available",
      sellerVisibleOnEveryOption: true,
      attachPolicy: "seller-proposes-admin-approves",
      canonical: "group",
      cartBehaviour: "line-per-member",
    },
    members: [
      { listingKey: "listing-eggs-farm-a", sellerKey: "store-farm-a", axisValues: { seller: "Farm A", grade: "standard" }, fixture: { sku: "EGG-A-12", priceInr: 80, stock: 40 } },
      { listingKey: "listing-eggs-farm-b", sellerKey: "store-farm-b", axisValues: { seller: "Farm B", grade: "standard" }, fixture: { sku: "EGG-B-12", priceInr: 90, stock: 25 } },
      { listingKey: "listing-eggs-farm-c", sellerKey: "store-farm-c", axisValues: { seller: "Farm C", grade: "standard" }, fixture: { sku: "EGG-C-12", priceInr: 70, stock: 60 } },
      { listingKey: "listing-eggs-farm-c-gf", sellerKey: "store-farm-c", axisValues: { seller: "Farm C", grade: "grass-fed" }, fixture: { sku: "EGG-C-GF-12", priceInr: 120, stock: 18 } },
    ],
  },
];

/**
 * A bundle is ONE product made of several — one price, one stock, one seller.
 * It is not a variant group and must never share its machinery: a buyer picking
 * a variant is choosing between alternatives, a buyer buying a bundle is
 * choosing a single thing that happens to contain others.
 */
export interface BundleDefinition {
  key: string;
  label: string;
  sellerKey: string;
  /** Catalogue products inside it, with quantities. */
  contents: { catalogueProductKey: string; qty: number }[];
  priceInr: number;
  /** Stock is the bundle's own count, not derived from its contents. */
  stock: number;
  /** Cancelling or refunding takes the whole bundle. */
  partialRefundAllowed: false;
}

export const bundlesSeedData: BundleDefinition[] = [
  {
    key: "bundle-burst-starter-kit",
    label: "Burst starter kit",
    sellerKey: "store-beyindia",
    contents: [
      { catalogueProductKey: "catalogue-dranzer-s", qty: 1 },
      { catalogueProductKey: "catalogue-launcher-grip", qty: 1 },
      { catalogueProductKey: "catalogue-stadium-mat", qty: 1 },
    ],
    priceInr: 3299,
    stock: 12,
    partialRefundAllowed: false,
  },
];

/**
 * A grouped listing sells several SEPARATE items as one unit — all-or-nothing
 * on stock and cancellation, but each item keeps its identity in the order.
 * The existing `features/grouped` mechanism already does this; what it lacked
 * was the collapsible grouped-table widget, which is now `tile.groupedTable`.
 */
export interface GroupedListingDefinition {
  key: string;
  label: string;
  sellerKey: string;
  listingKeys: string[];
  /** All items ship together; the group fails if any item is unavailable. */
  allOrNothing: true;
  priceInr: number;
}

export const groupedListingsSeedData: GroupedListingDefinition[] = [
  {
    key: "grouped-metal-fight-lot",
    label: "Metal Fight lot — 4 beys",
    sellerKey: "store-ripzone",
    listingKeys: ["listing-mf-01", "listing-mf-02", "listing-mf-03", "listing-mf-04"],
    allOrNothing: true,
    priceInr: 4100,
  },
];

/**
 * Validation that would otherwise only show up as a broken selector: every
 * member must declare a value on every axis the group marks required.
 */
const axesById = Object.fromEntries(variantAxesSeedData.map(a => [a.id, a]));
for (const group of variantGroupsSeedData) {
  for (const axisId of group.axes) {
    const axis = axesById[axisId];
    if (!axis) throw new Error(`variant group "${group.key}" uses unknown axis "${axisId}"`);
    if (!axis.requiredOnMember) continue;
    for (const m of group.members) {
      if (!(axisId in m.axisValues)) {
        throw new Error(`variant group "${group.key}": member "${m.listingKey}" is missing required axis "${axisId}"`);
      }
    }
  }
  if (group.rules.scope === "shared" && !group.rules.sellerVisibleOnEveryOption) {
    throw new Error(`variant group "${group.key}" is shared across sellers but hides the seller on options`);
  }
}

export const variantGroupsSeedDataBundle = {
  axes: variantAxesSeedData,
  groups: variantGroupsSeedData,
  bundles: bundlesSeedData,
  groupedListings: groupedListingsSeedData,
};
