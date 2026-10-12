/**
 * categoryTaxonomyBackfill — re-derive a moved or renamed category's subtree.
 *
 * ── 🛑 THE GAP THIS CLOSES, measured 2026-10-13 ────────────────────────────
 *
 * A category RENAME did nothing at all. `PUT /api/admin/categories/[id]` calls
 * `categoriesRepository.update(id, fields)` and stops, so after renaming a node:
 *
 *   - every product under it keeps the old `categoryNames`, and that array is
 *     what `buildProductSearchTxt` tokenises — so the listing stops being
 *     findable by its own category's NEW name and stays findable by the old
 *     one. Both halves are wrong and neither errors;
 *   - every DESCENDANT category keeps the old name inside its `ancestors[]`,
 *     and `buildCategorySearchTxt` indexes those deliberately ("typing burst
 *     reaches category-lost-longinus because Beyblade Burst is one of its
 *     ancestors") — so the subtree's own search breaks too.
 *
 * A REPARENT was already half-handled: `moveCategory` -> `reparentSubtree` ->
 * `rewriteProductChains` does re-derive the chains. 🛑 But it runs UNBOUNDED and
 * SYNCHRONOUSLY inside the request — one `.get()` over every product in the
 * subtree plus batched writes, against a 10s route ceiling (Rule #6) — and it
 * nets `metrics.*` only, never `categoryCounts`. So the LIVE count was stale
 * until the nightly recount while the grid was already correct, which produces
 * the worst symptom of the pair: a page reading "54 listings" above an empty
 * grid. A disagreement between two surfaces is worse than either being wrong.
 *
 * ── Why a JOB and not the trigger body ────────────────────────────────────
 *
 * Reparenting `category-beyblade-burst` touches hundreds of products. A trigger
 * is at-least-once, and `FieldValue.increment` is atomic but NOT idempotent —
 * which is exactly why counting lives in the repository rather than in a
 * trigger (Root Cause #92's neighbourhood).
 *
 * 🛑 A RE-DERIVE, by contrast, IS idempotent: it is a pure function of the live
 * tree, so running it twice writes the same values and the second run performs
 * zero writes. That property is the whole licence for a trigger to start it.
 *
 * ── 🛑 THE ISR COST, stated rather than discovered ────────────────────────
 *
 * Every product write fires `onProductWrite` -> `notifyRevalidate`, and this
 * project was paused with ISR writes at 3.1M against a 200K cap (15.5x). A
 * rename of one tier-2 node could therefore drop hundreds of ISR entries.
 * `productCacheFieldsChanged` already exists as the gate for exactly this
 * question, and `categoryNames` IS a cache field — a renamed category must
 * reach the rendered card, so the revalidation is correct rather than wasteful.
 * What would be wasteful is revalidating when only the ancestor IDS moved, which
 * no card renders; that case writes `categorySlugs` and nothing else.
 *
 * EXPORTS: runCategoryTaxonomyBackfill, CategoryTaxonomyBackfillPayload
 *
 * @tag domain:categories
 * @tag layer:job
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:JOB_RUNNERS via onJobCreated
 * @tag sideEffects:rewrites products.categorySlugs/categoryNames/searchTxt and categories.ancestors/searchTxt
 */

import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";
import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import { buildProductSearchTxt } from "../../../../utils/search-txt-builders";
import { normalizeError } from "../../../../errors/normalize";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface CategoryTaxonomyBackfillPayload {
  /** The node that moved or was renamed. */
  categoryId: string;
  /**
   * What changed. Both re-derive the product closure; only `"rename"` also
   * rewrites the subtree's own `ancestors[]`, because only a rename changes a
   * name a descendant has cached.
   */
  kind: "rename" | "reparent";
}

/** Firestore caps a batched write at 500 operations. */
const BATCH_LIMIT = 400;
/**
 * One page of products per read.
 *
 * 🛑 A bound is the point of this job existing — `rewriteProductChains` has
 * none, which is what makes it unsafe inside a request. Paged by document id so
 * the cursor needs no index.
 */
const PAGE_SIZE = 200;

/**
 * A hard ceiling on how much one run will touch.
 *
 * Saturating it is REPORTED and the run stops rather than silently truncating:
 * a half-backfilled subtree is a set of products that disagree with their own
 * tree, and `countersReconcile`'s `drifted` is the signal that says so. The
 * alternative — carrying on unbounded — is what the 540s function budget
 * cannot promise.
 */
const MAX_PRODUCTS = 20_000;

/**
 * Commit one page of product rewrites, chunked at Firestore's batch limit.
 *
 * Extracted because inline it reached brace-depth 6 and `audit-code-quality`
 * refuses that — correctly: the loop over a page, the chunking, and the
 * per-chunk failure handling are three separate concerns that read better apart.
 *
 * 🛑 A failed chunk is recorded per ROW rather than aborting the run. The rest
 * of the subtree is still worth fixing, and a partially-backfilled subtree is
 * exactly what `countersReconcile` reports as drift — so the failure is visible
 * either way, and stopping would make it larger.
 */
async function commitProductWrites(
  ctx: JobContext,
  categoryId: string,
  writes: { id: string; data: Partial<ProductDocument> }[],
  succeeded: string[],
  failed: { id: string; reason: string }[],
): Promise<void> {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const chunk = writes.slice(i, i + BATCH_LIMIT);
    const batch = ctx.db.batch();
    for (const w of chunk) {
      batch.update(ctx.db.collection(PRODUCT_COLLECTION).doc(w.id), {
        ...w.data,
        updatedAt: new Date(),
      });
    }
    try {
      await batch.commit();
      succeeded.push(...chunk.map((w) => w.id));
    } catch (err) {
      const e = normalizeError(err);
      for (const w of chunk) failed.push({ id: w.id, reason: e.message });
      ctx.logger.error("categoryTaxonomyBackfill: batch failed", err, { categoryId });
    }
  }
}

export async function runCategoryTaxonomyBackfill(
  payload: CategoryTaxonomyBackfillPayload,
  ctx: JobContext,
): Promise<JobRunResult> {
  const { categoryId, kind } = payload;
  const empty: JobRunResult = {
    summary: { total: 0, succeeded: 0, skipped: 0, failed: 0 },
    succeeded: [],
    skipped: [],
    failed: [],
  };

  if (!categoryId) {
    return {
      ...empty,
      failed: [{ id: "-", reason: "categoryId is required" }],
      summary: { total: 0, succeeded: 0, skipped: 0, failed: 1 },
    };
  }

  const moved = await categoriesRepository.findById(categoryId);
  if (!moved) {
    /*
     * Deleted between the write and this run. Not a fault: the delete route
     * cascades products to the parent itself, so there is nothing here to fix.
     */
    ctx.logger.warn("categoryTaxonomyBackfill: category not found", { categoryId });
    return { ...empty, skipped: [categoryId], summary: { total: 0, succeeded: 0, skipped: 1, failed: 0 } };
  }

  /*
   * The whole subtree, in one read. `getDescendants` is a single
   * `array-contains` over `parentIds` — which holds the FULL ancestor chain —
   * so depth costs nothing extra.
   */
  const descendants = await categoriesRepository.getDescendants(categoryId);
  const subtree = new Map([moved, ...descendants].map((c) => [c.id, c]));

  const succeeded: string[] = [];
  const skipped: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  /* ── 1. the subtree's own `ancestors[]`, on a rename only ──────────────── */
  if (kind === "rename") {
    try {
      const refreshed = await categoriesRepository.refreshSubtreeAncestors(categoryId);
      succeeded.push(...refreshed.map((id) => `category:${id}`));
    } catch (err) {
      const e = normalizeError(err);
      failed.push({ id: `category:${categoryId}`, reason: e.message });
      ctx.logger.error("categoryTaxonomyBackfill: ancestor refresh failed", err, { categoryId });
    }
  }

  /* ── 2. every product whose closure contains the moved node ────────────── */
  let scanned = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let truncated = false;

  for (;;) {
    let q = ctx.db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_FIELDS.CATEGORY_SLUGS, "array-contains", categoryId)
      .orderBy("__name__")
      .limit(PAGE_SIZE);
    if (cursor) q = q.startAfter(cursor);

    const page = await q.get();
    if (page.empty) break;

    const writes: { id: string; data: Partial<ProductDocument> }[] = [];

    for (const doc of page.docs) {
      scanned += 1;
      if (scanned > MAX_PRODUCTS) {
        truncated = true;
        break;
      }
      const data = doc.data() as ProductDocument;

      /*
       * Read the ASSIGNED list the same way every other consumer does —
       * `categoryIds`, then the closure head, then the scalar. A different
       * selection here would re-derive a chain from a leaf nothing else
       * considers the leaf.
       */
      const assignments =
        Array.isArray(data.categoryIds) && data.categoryIds.length > 0
          ? data.categoryIds
          : [((Array.isArray(data.categorySlugs) && data.categorySlugs[0]) || data.category || "")].filter(
              Boolean,
            );

      /*
       * 🛑 Resolve each assignment against the LIVE tree, falling back to the
       * subtree map we already hold. An assignment OUTSIDE the moved subtree is
       * unaffected by the move but still contributes its chain to the closure,
       * so it has to be resolved too — dropping it would shorten the closure
       * and un-list the product from a category it is genuinely in.
       */
      const resolved: { id: string; parentIds: string[]; name?: string; ancestorNames: string[] }[] = [];
      let unresolved = false;
      for (const id of assignments) {
        const cat = subtree.get(id) ?? (await categoriesRepository.findById(id));
        if (!cat) {
          unresolved = true;
          continue;
        }
        resolved.push({
          id,
          parentIds: cat.parentIds ?? [],
          name: cat.name,
          ancestorNames: (cat.ancestors ?? []).map((a) => a?.name ?? ""),
        });
      }

      if (resolved.length === 0) {
        // Never blank a chain we cannot improve on.
        skipped.push(doc.id);
        continue;
      }

      /*
       * The default is the DEEPEST assignment, and the tie-break is deliberately
       * NOT consulted here: reading counts per product would be one extra read
       * per row on a job that already pages thousands. A tie therefore falls to
       * the stored order, which is the order `deriveTaxonomy` already chose —
       * so a backfill never REORDERS a product's closure, it only repairs the
       * ids and names inside it.
       */
      const deepest = resolved.reduce((best, c) => {
        const tier = (subtree.get(c.id)?.tier ?? -1);
        const bestTier = (subtree.get(best.id)?.tier ?? -1);
        return tier > bestTier ? c : best;
      }, resolved[0]!);
      const ordered = [deepest, ...resolved.filter((c) => c.id !== deepest.id)];

      const categorySlugs: string[] = [];
      const seen = new Set<string>();
      for (const c of ordered) {
        for (const id of [c.id, ...c.parentIds.slice().reverse()]) {
          if (!id || seen.has(id)) continue;
          seen.add(id);
          categorySlugs.push(id);
        }
      }
      const categoryNames = [deepest.name, ...deepest.ancestorNames.slice().reverse()].filter(
        (n): n is string => !!n,
      );

      const slugsSame = (data.categorySlugs ?? []).join(">") === categorySlugs.join(">");
      const namesSame = (data.categoryNames ?? []).join(">") === categoryNames.join(">");
      if (slugsSame && namesSame) {
        // Idempotent: a synced row costs no write. This is what makes an
        // at-least-once trigger safe to start the job.
        skipped.push(doc.id);
        continue;
      }

      /*
       * 🛑 `searchTxt` is rebuilt whenever the NAMES moved, and that is the half
       * the reparent path never did. `buildProductSearchTxt` tokenises
       * `categoryNames`, so a rename that stopped there would leave every
       * product in the subtree findable by the old name and not the new one.
       */
      const next: Partial<ProductDocument> = { categorySlugs, categoryNames };
      if (!namesSame) {
        next.searchTxt = buildProductSearchTxt({ ...data, categoryNames });
      }
      writes.push({ id: doc.id, data: next });
    }

    if (writes.length > 0) {
      await commitProductWrites(ctx, categoryId, writes, succeeded, failed);
    }

    if (truncated) break;
    cursor = page.docs[page.docs.length - 1] ?? null;
    if (page.size < PAGE_SIZE) break;
  }

  if (truncated) {
    failed.push({
      id: categoryId,
      reason: `Stopped at the ${MAX_PRODUCTS}-product ceiling. The rest of the subtree still carries a stale chain — re-run, and expect countersReconcile to report drift.`,
    });
  }

  ctx.logger.info("categoryTaxonomyBackfill: complete", {
    categoryId,
    kind,
    subtreeSize: subtree.size,
    productsScanned: scanned,
    productsWritten: succeeded.filter((id) => !id.startsWith("category:")).length,
    productsSkipped: skipped.length,
    truncated,
  });

  return {
    summary: {
      total: succeeded.length + skipped.length + failed.length,
      succeeded: succeeded.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    succeeded,
    skipped,
    failed,
  };
}
