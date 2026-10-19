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
 * ## 🛑 There is no Parts tab, and that is deliberate
 *
 * It was removed 2026-10-20. Parts have a better home than a flat tab over
 * 752 leaves: `/parts/[classification]/[code]` is a purpose-built part
 * catalogue with composition data, and the `spares` listing type sells loose
 * parts. A fifth tab listing every part leaf duplicated the worse half of
 * both.
 *
 * The part leaves themselves are untouched and still reachable by drilling
 * down from their `*-parts` node, which is also why no `categoryType` was
 * involved: a part is identified by ANCESTRY, never by a discriminator
 * (`gen-category-parts.mjs` omits `categoryType` because 92 files read it and
 * a new value opts a row out of every path that works).
 *
 * 🛑 Do not confuse this with the product-detail **Parts composition tab**
 * ("What it is made of"), gated by `LISTING_TYPE_HAS_COMPOSITION`. That is a
 * different feature on a different surface and is unaffected.
 *
 * ## Why the tabs partition ONE payload
 *
 * The listing already fetches `?flat=true` once. Deriving all four tabs from
 * that single cached response costs no extra request — a per-tab query would
 * turn one fetch into four for the same data.
 *
 * @tag domain:categories
 * @tag layer:constants
 * @tag pattern:shared-literal
 * @tag sideEffects:none
 */

export type CategoryTabKey = "categories" | "brands" | "franchises" | "bundles";

export interface CategoryTabDef {
  key: CategoryTabKey;
  label: string;
}

/**
 * 🛑 No "All" tab. It was the default and it was the problem — it is what
 * rendered 1,185 undifferentiated rows. Every tab here answers a question
 * ("which brands do you carry?"); "all" answers none of them.
 */
export const CATEGORY_TABS: readonly CategoryTabDef[] = [
  { key: "categories", label: "Categories" },
  { key: "brands", label: "Brands" },
  { key: "franchises", label: "Franchises" },
  { key: "bundles", label: "Bundles" },
];

export const DEFAULT_CATEGORY_TAB: CategoryTabKey = "categories";

/** The minimum shape these predicates read. */
interface TabbableCategory {
  categoryType?: string | null;
  tier?: number | null;
}

const typeOf = (c: TabbableCategory): string => String(c.categoryType ?? "");

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
    case "categories":
      /*
       * A plain, top-level category. Part and model leaves are excluded by the
       * tier test — no leaf is tier 0 — but a reader should not have to derive
       * that, so the root test carries the meaning.
       */
      return type === "" && Number(c.tier ?? -1) === 0;
    default:
      return false;
  }
}
