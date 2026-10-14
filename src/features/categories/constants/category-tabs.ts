/**
 * How the categories index splits into tabs — ONE definition of each predicate.
 *
 * ## 🛑 The index shows ROOTS, not everything
 *
 * `/categories` used to render the whole flat forest: 1,185 rows, of which 752
 * are part leaves and 220 are model leaves. A visitor met a wall of names with
 * no sense of where they were. The Categories tab now shows the SIX roots and
 * you walk down — parent to child to leaf — which is how every catalogue of
 * this shape is browsed, and what the category detail page already supports
 * (it fetches every descendant and renders them tier-grouped).
 *
 * ## 🛑 Parts cannot be matched on `categoryType`
 *
 * Brands, franchises and bundles each carry a discriminator. Parts deliberately
 * DO NOT — `gen-category-parts.mjs` omits `categoryType` because 92 files read
 * it and a new value opts a row out of every path that works. So a part is
 * identified by its ANCESTRY: a leaf whose chain passes through one of the four
 * `*-parts` nodes. That is a fact about where it lives, not a flag that can
 * drift from it.
 *
 * ## Why the tabs partition ONE payload
 *
 * The listing already fetches `?flat=true` once. Deriving all five tabs from
 * that single cached response costs no extra request — a per-tab query would
 * turn one fetch into five for the same data.
 *
 * @tag domain:categories
 * @tag layer:constants
 * @tag pattern:shared-literal
 * @tag sideEffects:none
 */

/** The tier-2 nodes every part leaf hangs beneath. */
export const PART_PARENT_IDS: readonly string[] = [
  "category-original-parts",
  "category-metal-parts",
  "category-burst-parts",
  "category-x-parts",
];

export type CategoryTabKey = "categories" | "brands" | "franchises" | "parts" | "bundles";

export interface CategoryTabDef {
  key: CategoryTabKey;
  label: string;
}

/**
 * 🛑 No "All" tab. It was the default and it was the problem — it is what
 * rendered 1,185 undifferentiated rows. Every tab here answers a question
 * ("which parts do you have?"); "all" answers none of them.
 */
export const CATEGORY_TABS: readonly CategoryTabDef[] = [
  { key: "categories", label: "Categories" },
  { key: "brands", label: "Brands" },
  { key: "franchises", label: "Franchises" },
  { key: "parts", label: "Parts" },
  { key: "bundles", label: "Bundles" },
];

export const DEFAULT_CATEGORY_TAB: CategoryTabKey = "categories";

/** The minimum shape these predicates read. */
interface TabbableCategory {
  categoryType?: string | null;
  tier?: number | null;
  parentIds?: readonly string[] | null;
  isLeaf?: boolean | null;
}

const typeOf = (c: TabbableCategory): string => String(c.categoryType ?? "");

/** A leaf whose ancestry passes through a `*-parts` node. */
export function isPartCategory(c: TabbableCategory): boolean {
  if (typeOf(c)) return false; // brand / bundle / franchise / sublisting
  return (c.parentIds ?? []).some((p) => PART_PARENT_IDS.includes(String(p)));
}

/**
 * Does this row belong on the given tab?
 *
 * 🛑 The Categories tab is ROOTS ONLY (`tier === 0`). Brands, franchises and
 * bundles are tier-0 too but carry a discriminator, so the type check has to
 * come first or they would appear under Categories as well.
 */
export function matchesCategoryTab(c: TabbableCategory, tab: CategoryTabKey): boolean {
  const type = typeOf(c);
  switch (tab) {
    case "brands":
      return type === "brand";
    case "franchises":
      return type === "franchise";
    case "bundles":
      return type === "bundle";
    case "parts":
      return isPartCategory(c);
    case "categories":
      /*
       * A plain, top-level category. Parts are excluded by the type check
       * being empty AND tier 0 — no part leaf is tier 0 — but a reader should
       * not have to derive that, so the root test carries the meaning.
       */
      return type === "" && Number(c.tier ?? -1) === 0;
    default:
      return false;
  }
}
