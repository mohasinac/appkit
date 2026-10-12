/**
 * D4b — ONE breadcrumb chain builder, for the category page, the brand page and
 * the product detail pages.
 *
 * 🛑 A `BreadcrumbList` is the one JSON-LD node whose entire value is the ORDER,
 * and it is now emitted over a 416-node / 5-tier / 39-root forest rather than
 * the 47-node / 2-tier tree it was written against. Measured 2026-10-12:
 *
 *   per tier: t0=39  t1=23  t2=65  t3=71  t4=218
 *   deepest node -> 7 crumbs:
 *     Home > Categories > Spinning Tops > Beyblade Burst > Burst Tops > GT
 *       > Ace Dragon Sting Charge Zan
 *
 * Three surfaces render this chain and they must agree, or a crawler and a
 * visitor are shown different hierarchies for one page — which is worse than
 * emitting no breadcrumb, because a mismatched `BreadcrumbList` is a
 * structured-data error against a page that looks fine:
 *
 *   1. the visible `BreadcrumbTrail`
 *   2. this `BreadcrumbList`
 *   3. `categoryNames[]` on a product — the denormalised display cache
 *
 * 🛑 AND THE THIRD IS STORED LEAF-FIRST. Measured:
 *
 *     categorySlugs: category-x-basic > category-x-tops > … > category-spinning-tops
 *     categoryNames: Basic Line > Beyblade X Tops > … > Spinning Tops
 *
 * So anything rendering `categoryNames` in stored order shows the trail
 * BACKWARDS. Every current consumer takes `[0]` — the leaf — which is correct
 * for a single chip and is exactly why the reversal has never shown up. This
 * module reverses it once, here, so no call site has to remember.
 *
 * 🛑 `ancestors[]` IS THE SOURCE FOR A CATEGORY; `categoryNames`+`categorySlugs`
 * FOR A PRODUCT. Both `ancestors[]` and `parentIds[]` exist on a category and
 * describe the same chain — verified equal in length on all 416 live rows — so
 * neither is wrong, but two owners of one fact is Root Cause #42 waiting. The
 * choice is `ancestors[]` because it carries the display NAME, so the visible
 * trail needs no extra read; `parentIds[]` is ids only and stays what the
 * repository derives `categorySlugs` from.
 */

export interface BreadcrumbCrumb {
  name: string;
  /** Absent on the final crumb — the current page is not a link. */
  url?: string;
}

/** The shape `CategoryDocument.ancestors[]` entries have. */
export interface AncestorLike {
  id?: string | null;
  name?: string | null;
  tier?: number | null;
}

export interface CategoryChainInput {
  /** The category's own display name. */
  name?: string | null;
  /** Its own URL. Omitted on the last crumb, so pass it and let the caller decide. */
  url?: string;
  ancestors?: readonly AncestorLike[] | null;
  /** Builds a URL from an ancestor id. */
  hrefFor: (id: string) => string;
}

/**
 * Root → leaf, from a category's `ancestors[]`.
 *
 * 🛑 SORTED BY TIER, never taken as stored. An earlier revision of the category
 * page asserted `ancestors[]` is stored root-first and used it as given; the
 * visible `BreadcrumbTrail` on that same page had always sorted first, so the
 * stored order was relied on nowhere. Sorting is the only safe reading, and a
 * reversed breadcrumb is worse than none.
 *
 * 🛑 A BROKEN ANCESTOR IS OMITTED, NOT RENDERED AS A GAP. An entry with no id
 * or no name cannot be linked or labelled, and emitting `{ name: "" }` puts an
 * empty crumb in the middle of the trail — which reads as a missing level
 * rather than as an absent one. `deriveTaxonomy` warns and leaves a chain alone
 * when a leaf does not resolve (Root Cause #101), so a partial chain is a state
 * that really occurs. Measured 0 in production today, which is why the branch
 * needs a test rather than trust.
 *
 * A ROOT yields just itself — 39 of the 416 live rows are tier 0 (6 category
 * roots plus 28 brands and 5 bundles), so this is the common case, not an edge.
 * The caller's `Home` / `Categories` prefix is what keeps it a valid list.
 */
export function categoryCrumbs(input: CategoryChainInput): BreadcrumbCrumb[] {
  const ancestors = (input.ancestors ?? [])
    .filter((a): a is AncestorLike => !!a && !!a.id && !!a.name)
    .slice()
    .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));

  const out: BreadcrumbCrumb[] = ancestors.map((a) => ({
    name: String(a.name),
    url: input.hrefFor(String(a.id)),
  }));
  if (input.name) out.push({ name: input.name, url: input.url });
  return out;
}

export interface ProductChainInput {
  /** `[leaf, …ancestors, root]` — the STORED order. */
  categorySlugs?: readonly string[] | null;
  /** Parallel to `categorySlugs`, same stored leaf-first order. */
  categoryNames?: readonly string[] | null;
  hrefFor: (slug: string) => string;
}

/**
 * Root → leaf, from a product's stored chain.
 *
 * 🛑 THE TWO ARRAYS ARE PARALLEL AND MAY DISAGREE IN LENGTH. `deriveTaxonomy`
 * writes both together, but a row written before it existed — or one whose leaf
 * did not resolve — can carry a `categorySlugs` with no matching name. Pairing
 * by index past the shorter array would label one category with another's name,
 * which is a wrong hierarchy rendered confidently. So the chain stops at the
 * shorter of the two, and a slug with no name is dropped rather than shown as
 * its raw id.
 *
 * 🛑 A LOT FILES AT A NON-LEAF (G3a), so its chain is genuinely SHORTER and the
 * last crumb is a line or generation node rather than a named model. That is
 * correct and must not be padded: fabricating a leaf to fill the final position
 * would claim the lot is one specific model, which is the same false claim the
 * filing rule refuses at the write. Nothing here looks at `isLot` — the chain
 * is simply as long as it is, which is why no special case is needed.
 */
export function productCrumbs(input: ProductChainInput): BreadcrumbCrumb[] {
  const slugs = input.categorySlugs ?? [];
  const names = input.categoryNames ?? [];
  const n = Math.min(slugs.length, names.length);
  const out: BreadcrumbCrumb[] = [];
  // Stored leaf-first; reverse ONCE, here, so no call site has to know.
  for (let i = n - 1; i >= 0; i--) {
    const slug = slugs[i];
    const name = names[i];
    if (!slug || !name) continue;
    out.push({ name: String(name), url: input.hrefFor(String(slug)) });
  }
  return out;
}

/**
 * Prepend the two fixed crumbs every trail starts with, and drop the final
 * crumb's URL.
 *
 * The last crumb must not be a link — it is the page you are on, and Google's
 * own guidance is that the final breadcrumb identifies the current page. Doing
 * it here rather than at three call sites is what stops one of them forgetting.
 */
export function withTrailHead(
  crumbs: readonly BreadcrumbCrumb[],
  head: readonly BreadcrumbCrumb[],
): BreadcrumbCrumb[] {
  const all = [...head, ...crumbs];
  if (all.length > 0) {
    const last = all[all.length - 1];
    all[all.length - 1] = { name: last.name };
  }
  return all;
}
