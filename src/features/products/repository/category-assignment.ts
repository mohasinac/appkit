/*
 * WHY: a product could be filed under exactly ONE category, and the ancestor
 *      chain was derived onto it. That cannot express "this is a Dragoon G AND
 *      it is Beyblade" — two independent axes, which is what the franchise root
 *      exists for. Phase I makes assignment multiple.
 *
 * WHAT: the pure half of multi-category assignment — resolve the authored list,
 *       refuse the two shapes that are not allowed, pick the DEFAULT, and build
 *       the derived closure. No Firestore, no I/O, so every rule here is
 *       testable without a database.
 *
 * EXPORTS: MAX_CATEGORY_ASSIGNMENTS, ENFORCE_LEAF_FILING, ResolvedCategory,
 *          readAssignments, assertAssignmentShape, pickDefaultAssignment,
 *          buildTaxonomyClosure, findLeafRuleOffenders
 *
 * ── 🛑 THE CLOSURE IS ORDERED, AND THAT IS NOT COSMETIC ────────────────────
 *
 * `categorySlugs[0]` is read as "the leaf" in ~30 places across both repos —
 * measured, not assumed: the order-item snapshot (`expand-order-items.ts`,
 * whose own comment says *"`categorySlugs[0]` is the leaf — the chain is stored
 * self-first"*), BOTH count writers (`category-counts.ts`,
 * `countersReconcile.ts`), BOTH triggers (`onProductWrite.ts`), eight detail
 * views, `ProductForm.tsx` x5, the price-index data path,
 * `listing-adapters.ts`, `productTableColumns.tsx`, `CompareOverlay.tsx`, and
 * `rewriteProductChains`'s own `current[0]`.
 *
 * A set-shaped union of two chains destroys that invariant SILENTLY. Nothing
 * throws; the order snapshot simply starts recording whichever id happened to
 * land first, and the realised-price band moves with it. So the closure is
 * ordered DEFAULT CHAIN FIRST and index 0 stays the default leaf — every one of
 * those readers remains correct by construction rather than by being found.
 *
 * ── 🛑 ONE ASSIGNMENT PER ROOT ─────────────────────────────────────────────
 *
 * The user's rule, verbatim: *"a category can be multiple, they should not be
 * under same tree."* It is also the only rule under which `categoryCounts`'
 * invariant `own + sum(children.total) === total` still holds: a product
 * assigned to both an ancestor and its descendant would be counted `own` at the
 * ancestor AND contribute `total` up from the descendant, so the parent's two
 * figures would overlap and no invariant could be asserted.
 *
 * @tag domain:products
 * @tag layer:repository
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:ProductRepository.deriveTaxonomy
 * @tag sideEffects:none
 */

import { ConflictError, ValidationError } from "../../../errors";
import { LISTING_TYPE_HAS_COMPOSITION } from "../../parts/schemas/firestore";
import type { ListingType } from "../types/index";

/**
 * 🛑 A CAP, because the closure is `array-contains`-indexed and Firestore's
 * `array-contains-any` takes at most 30 comparison values.
 *
 * 4 assignments x 5 tiers (0-4) = 20 closure entries worst case, which leaves
 * headroom under that 30. It also bounds the index-entry cost: the seed loader
 * commits at most 20,000 array elements per batch, and every closure entry is
 * one index entry per product.
 */
export const MAX_CATEGORY_ASSIGNMENTS = 4;

/**
 * 🛑 THE FLIP. `false` = the leaf/non-leaf rule REPORTS; `true` = it refuses.
 *
 * It ships `false` and is flipped only once the data is clean, and the reason is
 * a measurement: **70 of the 71 hand-authored products file at a non-leaf
 * today** and not one of them is a lot. Enforcing first would make the whole
 * catalogue unsaveable — and worse, it would make the very seed writes that fix
 * the data fail, because those also go through `deriveTaxonomy`.
 *
 * This is the G3a lesson, which cost a symmetric rule its credibility: the plan
 * specified "a lot takes a non-leaf while singles take leaves", measurement
 * rejected the second half, and the half-rule has been live since. The rule is
 * right; enforcing it before its data is not.
 *
 * Flip procedure, and it is a ratchet rather than a judgement call: run
 * `findLeafRuleOffenders` over every seeded row, confirm **0**, then set `true`.
 * A hand count is not the measurement — the earlier one said 58 of 70 and this
 * pass measured 70 of 71.
 */
export const ENFORCE_LEAF_FILING = false;

/** A category document, reduced to the fields assignment actually needs. */
export interface ResolvedCategory {
  id: string;
  name?: string;
  /** The tree this assignment belongs to. Two assignments may not share one. */
  rootId?: string;
  /** Depth. Decides the default: deepest wins, because depth is specificity. */
  tier?: number;
  /**
   * 🛑 `undefined` is NOT `false` here. It means `buildCategoryTree` has not
   * rebuilt the tree, which is a fact about our data rather than about the
   * caller's input — so it gets its own refusal once enforcement is on.
   */
  isLeaf?: boolean;
  /** Root-first / nearest-last, as `category-tree.ts` writes it. */
  parentIds: string[];
  /** Root-first, parallel to `parentIds`. */
  ancestorNames: string[];
}

/**
 * The authored assignment list, from whichever field the caller used.
 *
 * Deliberately tolerant of all three existing shapes, because every one of them
 * is live today and none should need editing to keep working:
 *
 *   - `categoryIds: [a, b]`      the new multi-select
 *   - `category: "a"`            what `CategoryInlineSelect` writes, and what
 *                                `productCreateSchema` declares
 *   - `categorySlugs: [a, ...]`  the seed, and the admin `.passthrough()` route
 *
 * 🛑 The scalar still WINS over `categorySlugs`, unchanged from before this
 * change and for the recorded reason: the seller edit form sends a stale
 * derived chain alongside a fresh `category`, so preferring the chain resolved
 * the OLD leaf and wrote it back over the user's choice.
 *
 * Duplicates are deduped rather than refused. A duplicate assignment is exactly
 * equivalent to not having it, so there is no semantic question for the caller
 * to answer — unlike a duplicate assembly component, which would change
 * arithmetic.
 */
export function readAssignments(input: {
  categoryIds?: string[];
  category?: string;
  categorySlugs?: string[];
}): string[] {
  const raw = Array.isArray(input.categoryIds) && input.categoryIds.length > 0
    ? input.categoryIds
    : input.category
      ? [input.category]
      : Array.isArray(input.categorySlugs) && input.categorySlugs.length > 0
        ? /*
           * Only the HEAD, never the whole array. `categorySlugs` is a derived
           * closure: treating its ancestors as assignments would file a product
           * at every tier of its own chain, which the one-per-root rule would
           * then immediately refuse.
           */
          [input.categorySlugs[0]]
        : [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * 🛑 THE LEAF RULE DOES NOT APPLY TO EVERY LISTING TYPE, and measuring the data
 * is what showed that — the rule was wrong, not the catalogue.
 *
 * Of the 70 non-leaf singles, **31 are types that are not an instance of a
 * named model at all**: 8 app/coaching redemption codes, 8 city classifieds
 * (collections, kits, spare-part bundles), 6 sticker sheets, 5 art prints and
 * 4 live animals or plants. "Beyblade X App — Starter Pack Code" is not a
 * Dragoon G. A golden retriever puppy has no model leaf and never will.
 *
 * So the rule is scoped by the SAME predicate that already answers this
 * question for the Parts tab: does a listing of this type HAVE a part
 * composition — i.e. IS it the assembly, or does it merely depict one. Reusing
 * it rather than writing a second list is the point: a tenth listing type must
 * answer the question once, not twice, and two hand-written enumerations of one
 * union is Root Cause #61.
 *
 * `classified` and `live` stay `true` there, and that is deliberate: a
 * classified CAN be a single bey, and the seeded ones that are collections are
 * `isLot: true`, which the lot branch already permits at a non-leaf.
 */
export function leafRuleApplies(listingType: string | undefined): boolean {
  if (!listingType) return true;
  return LISTING_TYPE_HAS_COMPOSITION[listingType as ListingType] !== false;
}

/** Which assignments break the leaf rule, and why. Reporting shape, no throw. */
export function findLeafRuleOffenders(
  resolved: ResolvedCategory[],
  isLot: boolean,
  listingType?: string,
): { id: string; name?: string; reason: "lot-at-leaf" | "single-at-branch" | "not-indexed" }[] {
  const out: { id: string; name?: string; reason: "lot-at-leaf" | "single-at-branch" | "not-indexed" }[] = [];
  /*
   * The LOT half still applies to every type — filing a lot of twelve beys
   * under one model's leaf is a false claim about the items whatever the
   * listing type is. Only the SINGLE half is scoped.
   */
  if (!isLot && !leafRuleApplies(listingType)) return out;
  for (const c of resolved) {
    if (isLot) {
      if (c.isLeaf === true) out.push({ id: c.id, name: c.name, reason: "lot-at-leaf" });
      continue;
    }
    if (c.isLeaf === true) continue;
    out.push({
      id: c.id,
      name: c.name,
      reason: c.isLeaf === undefined ? "not-indexed" : "single-at-branch",
    });
  }
  return out;
}

/**
 * Refuse the shapes that are not allowed. Throws; never corrects.
 *
 * 🛑 REFUSED, never corrected — silently dropping a second assignment, or
 * re-filing one tier up, decides a taxonomy question on the seller's behalf and
 * leaves them a listing they can no longer find (Root Cause #76 inverted).
 */
export function assertAssignmentShape(
  resolved: ResolvedCategory[],
  isLot: boolean,
  opts: {
    enforceLeafFiling?: boolean;
    /** Scopes the SINGLE half of the leaf rule — see `leafRuleApplies`. */
    listingType?: string;
    warn?: (msg: string, meta?: object) => void;
  } = {},
): void {
  if (resolved.length > MAX_CATEGORY_ASSIGNMENTS) {
    throw new ValidationError(
      `A listing can be filed under at most ${MAX_CATEGORY_ASSIGNMENTS} categories; this one names ${resolved.length}.`,
    );
  }

  /*
   * One per root. Grouped on `rootId` rather than on an ancestor walk, because
   * `rootId` is already on every category document and a walk would cost a read
   * per assignment on the write path.
   *
   * A row with no `rootId` is skipped rather than refused: like `isLeaf`, its
   * absence means the tree has not been rebuilt, and refusing a write over our
   * own stale derived field turns a maintenance gap into a seller-facing error.
   */
  const byRoot = new Map<string, ResolvedCategory[]>();
  for (const c of resolved) {
    if (!c.rootId) continue;
    const group = byRoot.get(c.rootId);
    if (group) group.push(c);
    else byRoot.set(c.rootId, [c]);
  }
  for (const group of byRoot.values()) {
    if (group.length < 2) continue;
    const named = group.map((c) => `"${c.name ?? c.id}"`).join(" and ");
    throw new ValidationError(
      `${named} are in the same category tree, so a listing cannot be filed under both. ` +
        `Pick one, or pick the category above them that covers both.`,
    );
  }

  const offenders = findLeafRuleOffenders(resolved, isLot, opts.listingType);
  if (offenders.length === 0) return;

  /*
   * The lot half has been enforced since G3a and stays enforced regardless of
   * the flag — it is the half measurement VALIDATED, and the argument is about
   * the items rather than about counting: filing "12 assorted Burst beys" under
   * `category-dragoon-g` asserts all twelve are Dragoon G.
   */
  const lotAtLeaf = offenders.find((o) => o.reason === "lot-at-leaf");
  if (lotAtLeaf) {
    throw new ValidationError(
      `A lot holds several different items, so it cannot be filed under "${lotAtLeaf.name ?? lotAtLeaf.id}", ` +
        `which is a single-item category. Pick a broader category — its parent.`,
    );
  }

  if (!opts.enforceLeafFiling) {
    opts.warn?.(
      "Product files at a non-leaf category — allowed today, refused once ENFORCE_LEAF_FILING flips",
      { offenders },
    );
    return;
  }

  const notIndexed = offenders.find((o) => o.reason === "not-indexed");
  if (notIndexed) {
    /*
     * 409, not 400: the request is well formed and the seller is not confused —
     * OUR category tree has not been rebuilt, so we cannot tell whether that
     * node is a leaf. The correct next action is to rebuild the tree, not to
     * fix a field. Same distinction as removing a booked lottery slot.
     */
    throw new ConflictError(
      `"${notIndexed.name ?? notIndexed.id}" has not been indexed yet, so we cannot tell whether it is a ` +
        `single-item category. Rebuild the category tree and try again.`,
    );
  }

  const first = offenders[0]!;
  throw new ValidationError(
    `"${first.name ?? first.id}" has subcategories, so it describes a group rather than one item. ` +
      `Pick the specific category this listing belongs to — or mark it as a lot if it holds several different items.`,
  );
}

/**
 * Which assignment owns the breadcrumb, the canonical chain and index 0.
 *
 * Three deterministic levels:
 *   1. the DEEPEST assignment (highest `tier`);
 *   2. tie -> the highest listing count, which the caller supplies;
 *   3. still tied -> the order the seller picked.
 *
 * 🛑 "Most listings" CANNOT be the first criterion, and this is the one place
 * the instruction had to be corrected. A franchise node spans every product
 * type, so `category-beyblade` outranks `category-dragoon-g` on count for
 * EVERY Beyblade product — which would put `Home > Franchises > Beyblade` above
 * every listing and silently widen the realised-price band from "Dragoon G" to
 * "all Beyblade", because that band is keyed on the snapshotted
 * `categorySlugs[0]`.
 *
 * Depth decides because depth IS specificity, which is also the rule singles
 * are filed by. A model leaf is tier 4 and a franchise leaf is tier 1, so the
 * tie-break only ever runs between two equally specific assignments — exactly
 * where "which is busier" is the right question.
 *
 * `counts` is consulted ONLY on a tie, so the common single-assignment case
 * costs no extra read at all.
 */
export function pickDefaultAssignment(
  resolved: ResolvedCategory[],
  counts?: Map<string, number>,
): number {
  if (resolved.length <= 1) return 0;

  let best = 0;
  for (let i = 1; i < resolved.length; i += 1) {
    const a = resolved[i]!;
    const b = resolved[best]!;
    const tierA = a.tier ?? -1;
    const tierB = b.tier ?? -1;
    if (tierA > tierB) {
      best = i;
      continue;
    }
    if (tierA < tierB) continue;
    /*
     * `undefined` is not 0 here either: a category with no counts row has not
     * been counted, and defaulting it to 0 would let an uncounted node lose a
     * tie it might have won. Absent on BOTH sides falls through to authored
     * order, which is level 3.
     */
    const countA = counts?.get(a.id);
    const countB = counts?.get(b.id);
    if (countA !== undefined && (countB === undefined || countA > countB)) best = i;
  }
  return best;
}

/**
 * The derived closure and the display names.
 *
 * `categorySlugs` = the default chain leaf-first, then each remaining chain
 * leaf-first, deduped. See the header for why the order is load-bearing.
 *
 * `categoryNames` = the DEFAULT chain only. A union has no readable path, and
 * the breadcrumb builder reverses this array to render root-first — so keeping
 * it single-chain is what leaves every existing breadcrumb byte-identical.
 */
export function buildTaxonomyClosure(
  resolved: ResolvedCategory[],
  defaultIdx: number,
): { categorySlugs: string[]; categoryNames: string[]; categoryIdNames: string[] } {
  if (resolved.length === 0) {
    return { categorySlugs: [], categoryNames: [], categoryIdNames: [] };
  }

  const def = resolved[defaultIdx] ?? resolved[0]!;
  const ordered = [def, ...resolved.filter((c) => c.id !== def.id)];

  const categorySlugs: string[] = [];
  const seen = new Set<string>();
  for (const c of ordered) {
    // Self first, root last — byte-identical to what the seed hand-writes and
    // to what `rewriteProductChains` produces. Those three must agree.
    for (const id of [c.id, ...c.parentIds.slice().reverse()]) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      categorySlugs.push(id);
    }
  }

  const categoryNames = [def.name, ...def.ancestorNames.slice().reverse()].filter(
    (n): n is string => !!n,
  );

  /*
   * I5b — one display name per ASSIGNMENT, in the same order, so the breadcrumb
   * row can offer the other categories as links without a second read on a
   * cached page. Deliberately NOT their full chains: the alternate crumb shows
   * the other categories, not N stacked trails.
   */
  const categoryIdNames = ordered.map((c) => c.name ?? c.id);

  return { categorySlugs, categoryNames, categoryIdNames };
}
