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
/** id -> its ancestors, NEAREST FIRST (parent, grandparent, …, root). */
let ancestorsById: Map<string, string[]> | null = null;

function build(): void {
  const n = new Map<string, string | undefined>();
  const a = new Map<string, string[]>();
  const walk = (nodes: readonly ForestNode[] | undefined, trail: string[]): void => {
    for (const node of nodes ?? []) {
      if (typeof node.id === "string") {
        n.set(node.id, node.name);
        a.set(node.id, [...trail]);
        walk(node.children, [node.id, ...trail]);
      } else {
        // A node with no id contributes no ancestry, but its children still do.
        walk(node.children, trail);
      }
    }
  };
  walk(CATEGORY_FOREST as readonly ForestNode[], []);
  nameById = n;
  ancestorsById = a;
}

function names(): Map<string, string | undefined> {
  if (!nameById) build();
  return nameById as Map<string, string | undefined>;
}

function ancestors(): Map<string, string[]> {
  if (!ancestorsById) build();
  return ancestorsById as Map<string, string[]>;
}

export function deriveCategoryNames(slugs: readonly string[] | undefined): string[] | undefined {
  if (!Array.isArray(slugs) || slugs.length === 0) return undefined;
  const byId = names();
  return slugs.map((id) => byId.get(id) ?? id);
}

/**
 * Derive the full ancestor closure from the head of an existing chain.
 *
 * ## 🛑 The drift this ends — measured, 6 of 1,039 live products
 *
 * `categorySlugs` is the ancestor closure and it was hand-written per record
 * too, so a chain could SKIP A TIER and nothing noticed:
 *
 *     product-beyblade-original-driger-v
 *       got      driger-v > original-tops > beyblade-original > spinning-tops
 *       expected driger-v > original-magnacore > original-tops > …
 *
 * The category page matches `array-contains-any [its own id]` against this
 * array (CLAUDE.md: "a category page matches on its own id alone"), so a
 * missing intermediate means the product is **absent from that node's page**
 * while appearing correctly on every other node in its chain. Six products were
 * invisible on their own system sub-line.
 *
 * `countersReconcile`'s rollup invariant cannot see this: it computes the counts
 * FROM these closures, so a skipped tier is simply a tier with a lower count,
 * and `own + Σ(children.total) === total` still holds exactly. The only way to
 * find it is to re-derive the chain and compare.
 *
 * ## 🛑 A SECOND ASSIGNMENT IS LEFT ALONE, NOT COLLAPSED
 *
 * This derives from `slugs[0]` — the head, which is what `readAssignments`
 * treats as the assignment. A product filed under two roots would carry two
 * concatenated closures, and deriving from the head alone would silently DELETE
 * the second one, turning a drift-fix into data loss.
 *
 * So the rule is: overwrite only when the existing array is a SUBSET of the
 * derived closure. That is precisely the drift case (ids missing from the
 * middle). An id outside the derived closure means either a second assignment
 * or something this helper cannot safely interpret, and both must survive to be
 * reported rather than be quietly rewritten.
 *
 * Measured when this was written: 0 of 71 seeded products carry `categoryIds`
 * and 0 carry a multi-root closure — so the subset rule fires on all six real
 * cases and guards a case that does not exist yet.
 */
export function deriveCategoryClosure(
  slugs: readonly string[] | undefined,
): string[] | undefined {
  if (!Array.isArray(slugs) || slugs.length === 0) return undefined;
  const head = slugs[0];
  const chain = ancestors().get(head);
  // An unknown head keeps its hand-written chain: inventing one from a node the
  // forest does not have would be worse than leaving a visibly wrong value for
  // the dangling-id sweep to find.
  if (!chain) return undefined;
  const derived = [head, ...chain];
  const outside = slugs.filter((s) => !derived.includes(s));
  if (outside.length > 0) return undefined;
  return derived;
}

/**
 * Pipeline step: replace whatever `categorySlugs` and `categoryNames` a record
 * carries with the derivation. Deliberately an OVERWRITE rather than a
 * fill-if-absent — a hand-written value that disagrees IS the defect, so
 * preferring it would preserve every one of them.
 *
 * Order matters: the closure is derived first, then the names from the derived
 * closure. Deriving names from the stale chain and then fixing the chain would
 * leave the two mirrors disagreeing again, one tier apart.
 */
export function withDerivedCategoryNames(
  p: Partial<ProductDocument>,
): Partial<ProductDocument> {
  const closure = deriveCategoryClosure(p.categorySlugs);
  const slugs = closure ?? p.categorySlugs;
  const names = deriveCategoryNames(slugs);
  if (!closure && !names) return p;
  return {
    ...p,
    ...(closure ? { categorySlugs: closure } : {}),
    ...(names ? { categoryNames: names } : {}),
  };
}
