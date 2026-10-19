/*
 * WHY: Two surfaces now need "the price guidance that applies to this leaf":
 *      the seller form's hint (`/api/categories/[id]/price-guidance`) and the
 *      public realised-price tool's gated market half
 *      (`/api/tools/price-index/market`). The ancestor walk was written
 *      privately inside the first of those, which is exactly the shape Root
 *      Cause #75 describes — a rule reachable by copy-paste gets copied, and
 *      the copy never learns about the branch added later.
 * WHAT: The nearest-first inherited `priceGuidance` resolution, for one leaf
 *       and for many, in one place.
 *
 * EXPORTS:
 *   MAX_GUIDANCE_ANCESTORS      — the walk bound
 *   ResolvedGuidance            — a band PLUS which node it came from
 *   resolveInheritedGuidance    — one leaf document -> its applicable guidance
 *   resolveInheritedGuidanceMany — N leaf ids -> a Map, two batched reads
 *
 * 🛑 Why a leaf's OWN band wins. `MARKET_BANDS` is keyed on era / part /
 *    launcher / stadium leaves (`category-burst-db`, `category-metal-energy-rings`),
 *    never on the ~216 named-model leaves — the crawl measured a generation,
 *    not a bey. So a model leaf has no band of its own and inherits its era's,
 *    which is the whole reason this walk exists rather than a direct read.
 *
 * @tag domain:categories
 * @tag layer:server
 * @tag pattern:resolver
 * @tag access:server-only
 * @tag consumers:categories/api/[id]/price-guidance,price-index/market
 * @tag sideEffects:none
 */

import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";
import type { CategoryPriceGuidance } from "../../../../features/categories/schemas/category-content";

/**
 * How far up the chain to look.
 *
 * `parentIds` holds the FULL ancestor chain (CLAUDE.md § "Category Tree"), and
 * the forest is four tiers, so eight is slack rather than a limit. It exists so
 * a malformed chain cannot turn one lookup into an unbounded read.
 */
export const MAX_GUIDANCE_ANCESTORS = 8;

/** The fields of a category document this resolution reads. */
export interface GuidanceLeafDoc {
  id?: string;
  name?: string;
  parentIds?: string[];
  productDefaults?: { priceGuidance?: CategoryPriceGuidance };
}

/**
 * A resolved band together with WHERE it came from.
 *
 * 🛑 The provenance is not decoration, and a caller that drops it will
 * misattribute. `MARKET_BANDS` is keyed on era and part leaves, never on the
 * ~216 named-model leaves, so a model lookup almost always resolves an
 * ancestor's band — "typical for Burst DB" is a true statement about the data
 * and "typical for Rage Longinus" is not. A renderer needs to be able to say
 * which one it is showing.
 */
export interface ResolvedGuidance {
  guidance: CategoryPriceGuidance;
  /** The node the band was read off — the leaf itself, or an ancestor. */
  fromCategoryId: string;
  fromName?: string;
  /** `false` when the leaf carried its own band. */
  inherited: boolean;
}

/**
 * Nearest-first ancestor walk for one leaf.
 *
 * The leaf's own band wins; only a leaf with none falls back to the nearest
 * ancestor that has one.
 *
 * 🛑 ONE bounded `findByIds`, never a sequential walk. A seller form hits this
 * on every category change, and paying up to eight round trips for a hint is
 * how a hint becomes the slowest thing on the page.
 *
 * 🛑 `parentIds` is stored ROOT-FIRST, so it is reversed to walk nearest-first.
 * Walking it as stored would hand a model leaf the ROOT's band — and since the
 * root carries a tax default but no market band, that would usually resolve to
 * nothing and read as "no data" for a leaf whose era has a measured band.
 */
export async function resolveInheritedGuidance(
  leaf: GuidanceLeafDoc,
): Promise<CategoryPriceGuidance | undefined> {
  if (leaf.productDefaults?.priceGuidance) return leaf.productDefaults.priceGuidance;

  const parentIds = (leaf.parentIds ?? []).slice(0, MAX_GUIDANCE_ANCESTORS);
  if (parentIds.length === 0) return undefined;

  const nearestFirst = [...parentIds].reverse();
  const ancestors = await categoriesRepository.findByIds(nearestFirst);
  const byId = new Map(ancestors.map((a) => [a.id, a as GuidanceLeafDoc]));
  for (const pid of nearestFirst) {
    const guidance = byId.get(pid)?.productDefaults?.priceGuidance;
    if (guidance) return guidance;
  }
  return undefined;
}

/**
 * The same resolution for MANY leaves, in two batched reads total.
 *
 * Read 1 fetches the leaves; read 2 fetches the UNION of every ancestor id
 * none of them resolved locally. A per-leaf `resolveInheritedGuidance` would be
 * N+1 reads against Rule #6's ~3-round-trip budget, and the tool resolves up to
 * `PRICE_INDEX_SEARCH_LIMIT` leaves at once.
 *
 * Leaves that resolve to nothing are ABSENT from the returned map rather than
 * present with `undefined` — the caller distinguishes "no band applies here"
 * from "this id does not exist", and both are legitimate answers it must be
 * able to tell apart.
 */
export async function resolveInheritedGuidanceMany(
  ids: readonly string[],
): Promise<Map<string, ResolvedGuidance>> {
  const out = new Map<string, ResolvedGuidance>();
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  if (unique.length === 0) return out;

  const leaves = (await categoriesRepository.getManyByIds(unique)) as GuidanceLeafDoc[];

  /*
   * Everything still unanswered after the leaves' own bands, paired with the
   * nearest-first chain it needs — collected before the second read so that
   * read is one call for every leaf at once.
   */
  const pending: Array<{ id: string; chain: string[] }> = [];
  const wanted = new Set<string>();

  for (const leaf of leaves) {
    const id = leaf.id;
    if (!id) continue;
    const own = leaf.productDefaults?.priceGuidance;
    if (own) {
      out.set(id, {
        guidance: own,
        fromCategoryId: id,
        ...(leaf.name ? { fromName: leaf.name } : {}),
        inherited: false,
      });
      continue;
    }
    const chain = [...(leaf.parentIds ?? []).slice(0, MAX_GUIDANCE_ANCESTORS)].reverse();
    if (chain.length === 0) continue;
    pending.push({ id, chain });
    for (const pid of chain) wanted.add(pid);
  }

  if (pending.length === 0) return out;

  const ancestors = (await categoriesRepository.findByIds([...wanted])) as GuidanceLeafDoc[];
  const byId = new Map(
    ancestors.filter((a) => a.id).map((a) => [a.id as string, a]),
  );

  for (const { id, chain } of pending) {
    for (const pid of chain) {
      const ancestor = byId.get(pid);
      const guidance = ancestor?.productDefaults?.priceGuidance;
      if (guidance) {
        out.set(id, {
          guidance,
          fromCategoryId: pid,
          ...(ancestor?.name ? { fromName: ancestor.name } : {}),
          inherited: true,
        });
        break;
      }
    }
  }

  return out;
}
