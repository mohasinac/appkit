/**
 * Recompute `surfaceCounts/global` — "does each public browse surface have
 * anything in it?"
 *
 * ## 🛑 It asks `listPublicProducts`, not Firestore
 *
 * The temptation is a `count()` aggregation per listing type. That would be
 * cheaper and it would be WRONG, because "available" is not expressible as a
 * Firestore predicate: it is a negation (`NOT (sold OR ended OR closed OR
 * depleted)`) evaluated per row, which is exactly why `listPublicProducts`
 * runs one bounded query per unavailable-clause and filters in memory.
 *
 * A bespoke count would therefore answer a DIFFERENT question from the page it
 * governs, and the failure mode is the bad one: hiding `/spares` while
 * `/spares` would have rendered rows. Routing through the one function every
 * browse page already uses makes that disagreement impossible by construction
 * — the same argument CLAUDE.md makes for never calling
 * `productRepository.list()` directly from a listing view.
 *
 * ## Cost
 *
 * `pageSize: 1` — we need existence, not a figure. Ten listing types plus one
 * review query, each bounded, and only from a job or a boundary-crossing
 * trigger. Never from a request path: the public reader gets the single
 * pre-computed document via `/api/site-settings`.
 *
 * ## 🛑 A failed probe writes NOTHING for that type
 *
 * `listPublicProducts` returns `null` on failure. Recording that as `0` would
 * hide a surface because a query timed out, so a failed probe leaves the key
 * ABSENT — which every reader treats as "show" (Root Cause #72). Partial
 * results are written: a surface we did measure is still worth recording.
 *
 * @tag domain:products
 * @tag layer:job
 * @tag access:server-only
 * @tag sideEffects:firestore-read,firestore-write
 */

import { normalizeError } from "../../../../errors/normalize";
import { listPublicProducts } from "../../features/products/list-public";
import {
  SURFACE_COUNTS_COLLECTION,
  SURFACE_COUNTS_DOC_ID,
  type SurfaceCountsDocument,
} from "../../../../features/products/schemas/surface-counts";
import { ALL_LISTING_TYPES } from "../../../shared/listing-types/feature-flags";
import {
  REVIEW_COLLECTION,
  reviewQueryHelpers,
} from "../../../../features/reviews/schemas/firestore";
import type { ListingType } from "../../../../features/products/types/index";
import type { JobContext } from "../runtime/types";

export interface SurfaceCountsResult {
  listingTypes: Partial<Record<ListingType, number>>;
  surfaces: Partial<Record<string, number>>;
  /** Types whose probe failed — recorded so a silent partial is visible. */
  failed: string[];
}

/**
 * Probe one listing type. Returns `undefined` — not 0 — when the query failed.
 *
 * `total` is a FLOOR once `truncated` is set, which does not matter here: we
 * only compare against zero, and a floor of N > 0 is still decisively
 * non-empty.
 */
async function probeListingType(type: ListingType): Promise<number | undefined> {
  try {
    const res = await listPublicProducts({ listingTypes: [type], pageSize: 1 });
    if (!res) return undefined;
    return res.total;
  } catch (err) {
    void normalizeError(err);
    return undefined;
  }
}

export async function computeSurfaceCounts(
  ctx: Pick<JobContext, "db">,
  only?: readonly ListingType[],
): Promise<SurfaceCountsResult> {
  const types = only ?? ALL_LISTING_TYPES;
  const listingTypes: Partial<Record<ListingType, number>> = {};
  const surfaces: Partial<Record<string, number>> = {};
  const failed: string[] = [];

  // Parallel: ten bounded queries with no interdependence. Sequential would
  // be ten round-trips for no benefit.
  const probes = await Promise.all(types.map((t) => probeListingType(t)));
  types.forEach((t, i) => {
    const n = probes[i];
    if (n === undefined) failed.push(t);
    else listingTypes[t] = n;
  });

  // `/reviews` has no listing-type flag, so emptiness is its only signal.
  // A plain `count()` IS correct here: a review has no availability notion —
  // it is approved and public, or it is not in the collection's public view.
  if (!only) {
    try {
      // `reviewQueryHelpers.approved()` rather than a hand-written
      // `["isApproved", "==", true]` — which is what this first read, and the
      // field does not exist. Approval is `status == "approved"`, and a filter
      // on an absent field matches NOTHING, so the hand-written version would
      // have reported every site as having zero reviews and hidden /reviews
      // permanently. The helper is the shipped spelling.
      const [field, op, value] = reviewQueryHelpers.approved();
      const snap = await ctx.db
        .collection(REVIEW_COLLECTION)
        .where(field, op, value)
        .limit(1)
        .get();
      surfaces.reviews = snap.size;
    } catch (err) {
      void normalizeError(err);
      failed.push("reviews");
    }
  }

  return { listingTypes, surfaces, failed };
}

/**
 * Recompute and persist.
 *
 * `only` narrows to the types a single product write could have moved, so the
 * trigger path costs one query instead of eleven. A narrowed run MERGES — it
 * must never clear the keys it did not measure.
 */
export async function runSurfaceCountsRollup(
  ctx: Pick<JobContext, "db">,
  only?: readonly ListingType[],
): Promise<SurfaceCountsResult> {
  const result = await computeSurfaceCounts(ctx, only);

  const payload: Partial<SurfaceCountsDocument> = { updatedAt: new Date() };

  /*
   * 🛑 NESTED MAPS, NOT DOT-PATHED KEYS — and the previous spelling here was a
   * silently-failed safety gate, which is the worst failure shape there is.
   *
   * This wrote `payload["listingTypes." + k] = v` and then called
   * `.set(payload, { merge: true })`. **Firestore resolves `"a.b"` as a nested
   * field path only in `update()`. In `set()` it is a literal field name that
   * happens to contain a dot.** So `surfaceCounts/global` held top-level fields
   * NAMED `listingTypes.standard`, `surfaces.reviews`, … and no `listingTypes`
   * map at all. `getSurfaceCounts` reads `data.listingTypes` → `undefined` →
   * `sanitize(undefined)` → `undefined` → both maps absent → the function
   * returns `undefined` and every reader takes the fail-open path. The module's
   * own warning names the consequence: "surfaces will all render visible".
   *
   * The gate had therefore never fired, on any surface, ever. Corroborated
   * live: `GET /api/site-settings` returned `hiddenSurfacePaths:
   * ["/classified","/live"]` — exactly the two listing types flagged `false`,
   * i.e. hidden by FLAG. Not one path was contributed by a measured count.
   *
   * The comment that justified the dot-paths had it exactly backwards: it
   * feared `{ listingTypes: {...} }` with `merge: true` would "replace the
   * whole map on some drivers". Verified against the SHIPPED driver
   * (`@google-cloud/firestore/build/src/document.js`, `DocumentMask.fromObject`):
   * it recurses into plain objects and pushes only LEAF paths, so
   * `{ listingTypes: { standard: 5 } }` produces the update mask
   * `["listingTypes.standard"]`. A narrowed run cannot touch a sibling key.
   * That is the merge behaviour this job needs, and it is what the hazard
   * story claimed was unavailable.
   *
   * ⚠ ONE REAL HAZARD IN THE SAME FUNCTION, which is why the guards below are
   * not defensive clutter. `extractFieldPaths` ends with *"Add a field path for
   * an explicitly updated empty map"* — `if (currentPath && isEmpty)
   * fieldPaths.push(currentPath)`. So writing `{ listingTypes: {} }` masks
   * `listingTypes` ITSELF and **wipes the whole map**. An all-probes-failed run
   * (`listingTypes` empty, every type in `failed`) would therefore erase every
   * figure the last good run recorded — turning a transient query failure into
   * "nothing is measured". Omit an empty map and the run writes only
   * `updatedAt`, which is the correct no-op.
   *
   * The contrast case lives in this repo and is correct as written:
   * `scripts/seed-demo-inventory.mjs:485` dot-paths an `.update()`. Dotted keys
   * are not the defect — dotted keys in `set()` are.
   */
  if (Object.keys(result.listingTypes).length > 0) {
    payload.listingTypes = result.listingTypes;
  }
  if (Object.keys(result.surfaces).length > 0) {
    payload.surfaces = result.surfaces;
  }

  await ctx.db
    .collection(SURFACE_COUNTS_COLLECTION)
    .doc(SURFACE_COUNTS_DOC_ID)
    .set(payload, { merge: true });

  return result;
}
