import type { ProductDocument } from "../../features/products/schemas";
import { CATEGORY_FOREST } from "./category-forest";

/**
 * Derive `categoryNames` from `categorySlugs`, so the two cannot disagree.
 *
 * ## 🛑 The drift this ends — measured, 20 of 71 products
 *
 * `categoryNames` is the display mirror of `categorySlugs`, and both were
 * hand-written per record across nine seed files. So every time a product was
 * re-filed, the slug chain moved and the name chain did not — and nothing
 * failed, because no reader cross-checks them. Measured before this helper
 * existed: **20 of 71** products carried names that disagreed with their own
 * slugs, several of them wrong by a whole GENERATION.
 *
 *     product-beyblade-metal-storm-pegasus
 *       slugs : [storm-pegasus-105rf, metal-fusion, …]
 *       names : ["Metal Masters", "Metal Fight Tops", …]   ← one generation out
 *
 * A breadcrumb built from `categoryNames` therefore told a buyer the item was
 * Metal Masters while every link under it pointed at Metal Fusion. Four of the
 * twenty predate any of this session's re-filings, so this is not a transient
 * — it is what a hand-maintained mirror does (Recurrent Root Cause #42).
 *
 * ## Why derive rather than fix the twenty
 *
 * Fixing them by hand restores agreement for exactly as long as nobody touches
 * a chain again. `ProductRepository.deriveTaxonomy()` already derives BOTH
 * fields on every real write for precisely this reason; the seed is the one
 * writer that bypassed it, because it writes documents directly. This closes
 * that gap at the same place — one derivation, applied in every file's export
 * pipeline, so a re-filing is a single-line change that cannot go half-done.
 *
 * ## 🛑 An unresolvable id keeps its position, and is NOT silently dropped
 *
 * A slug with no category row yields `?? id`, which renders visibly wrong in a
 * breadcrumb rather than shortening the chain. Dropping it would make the two
 * arrays different lengths — the one shape that makes a positional mirror
 * impossible to reason about — and would hide a dangling id, which is the
 * thing `countersReconcile`'s dangling-id sweep exists to find.
 */
/*
 * 🛑 SOURCED FROM `CATEGORY_FOREST`, NOT FROM `categoriesSeedData` — and the
 * difference is a circular import, not a preference.
 *
 * Reading the assembled seed array threw `ReferenceError: Cannot access
 * 'categoriesSeedData' before initialization`. The products seeds build their
 * exports AT MODULE SCOPE (`_raw….map(…)`), so this helper runs during their
 * initialisation — and both they and the category seed are re-exported from
 * `seed/index.ts`, so whichever the loader reaches first sees the other's
 * binding still in its TDZ. Making the map lazy did NOT fix it, because the
 * first call happens inside that same module-scope evaluation.
 *
 * The forest is the right source anyway: it is the hand-authored structure the
 * category seed itself derives FROM (via `buildCategoryTree`), it carries `id`
 * and `name` on every node, and it imports nothing from any product seed — so
 * there is no cycle to break. `buildCategoryTree` only adds the derived
 * fields (`isLeaf`, `tier`, `parentIds`, …); it never renames a node, so the
 * names here are identical to the seeded ones by construction.
 *
 * Model leaves are included because `line()` splices `MODEL_LEAVES` into the
 * forest as real children — so walking `children` reaches them without this
 * file needing to know that map exists.
 */
interface ForestNode {
  id?: string;
  name?: string;
  children?: ForestNode[];
}

let nameById: Map<string, string | undefined> | null = null;

function names(): Map<string, string | undefined> {
  if (!nameById) {
    const m = new Map<string, string | undefined>();
    const walk = (nodes: readonly ForestNode[] | undefined): void => {
      for (const n of nodes ?? []) {
        if (typeof n.id === "string") m.set(n.id, n.name);
        walk(n.children);
      }
    };
    walk(CATEGORY_FOREST as readonly ForestNode[]);
    nameById = m;
  }
  return nameById;
}

export function deriveCategoryNames(slugs: readonly string[] | undefined): string[] | undefined {
  if (!Array.isArray(slugs) || slugs.length === 0) return undefined;
  const byId = names();
  return slugs.map((id) => byId.get(id) ?? id);
}

/**
 * Pipeline step: replace whatever `categoryNames` a record carries with the
 * derivation. Deliberately an OVERWRITE rather than a fill-if-absent — a
 * hand-written value that disagrees is exactly the defect, so preferring it
 * would preserve all twenty.
 */
export function withDerivedCategoryNames(
  p: Partial<ProductDocument>,
): Partial<ProductDocument> {
  const names = deriveCategoryNames(p.categorySlugs);
  return names ? { ...p, categoryNames: names } : p;
}
