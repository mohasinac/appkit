/**
 * storeNameBackfill — re-sync a store's denormalized display fields onto its
 * products.
 *
 * `ProductDocument.storeName` / `.storeSlug` are denormalized because the public
 * browse query never touches `storeRepository`: a listing card can only show a
 * seller if the product document already names one. Denormalizing without a
 * re-sync is the mirror-drift trap (Root Cause #42) — a renamed store would keep
 * showing its old name on every card it owns, forever, with nothing reporting a
 * problem.
 *
 * This runs as a JOB rather than inline in the rename request because the write
 * is unbounded: a store with hundreds of listings would blow the 10s Vercel
 * ceiling (Rule #6). It reuses the existing Async Job Primitive
 * (`enqueueJob` → `onJobCreated` → JOB_RUNNERS), so it costs no new Cloud
 * Scheduler job.
 *
 * Idempotent: a product already carrying both correct values is skipped, so a
 * re-run over a synced catalogue performs zero writes.
 */

import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";
import { storeRepository } from "../../../../features/stores/repository/store.repository";
import { productRepository } from "../../../../features/products/repository/products.repository";
import { normalizeError } from "../../../../errors/normalize";

export interface StoreNameBackfillPayload {
  /** The store's slug — which is also its document id, and the products' `storeId`. */
  storeId: string;
}

/** Firestore caps a batched write at 500 operations. */
const BATCH_LIMIT = 500;

export async function runStoreNameBackfill(
  payload: StoreNameBackfillPayload,
  ctx: JobContext,
): Promise<JobRunResult> {
  const { storeId } = payload;
  const empty: JobRunResult = {
    summary: { total: 0, succeeded: 0, skipped: 0, failed: 0 },
    succeeded: [],
    skipped: [],
    failed: [],
  };

  if (!storeId) {
    return { ...empty, failed: [{ id: "-", reason: "storeId is required" }],
      summary: { total: 0, succeeded: 0, skipped: 0, failed: 1 } };
  }

  const store = await storeRepository.findById(storeId);
  if (!store) {
    // Not an error worth failing the job over — a store deleted between the
    // rename and this run is a race, not a fault. Its products are handled by
    // the store-deletion cascade, not here.
    ctx.logger.warn("storeNameBackfill: store not found", { storeId });
    return { ...empty, skipped: [storeId], summary: { total: 0, succeeded: 0, skipped: 1, failed: 0 } };
  }

  const products = await productRepository.findByStore(storeId);
  const stale = products.filter(
    (p) => p.storeName !== store.storeName || p.storeSlug !== store.storeSlug,
  );

  const succeeded: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (let i = 0; i < stale.length; i += BATCH_LIMIT) {
    const chunk = stale.slice(i, i + BATCH_LIMIT);
    const batch = ctx.db.batch();
    for (const product of chunk) {
      batch.update(ctx.db.collection("products").doc(product.id!), {
        storeName: store.storeName,
        storeSlug: store.storeSlug,
        updatedAt: ctx.now,
      });
    }
    try {
      await batch.commit();
      succeeded.push(...chunk.map((p) => p.id!));
    } catch (err) {
      // Per-chunk, not per-job: one failed batch must not discard the chunks
      // that already committed, and the job is idempotent so a retry is safe.
      const reason = normalizeError(err).message;
      failed.push(...chunk.map((p) => ({ id: p.id!, reason })));
    }
  }

  const skipped = products.length - stale.length;
  ctx.logger.info("storeNameBackfill: complete", {
    storeId,
    storeName: store.storeName,
    updated: succeeded.length,
    skipped,
    failed: failed.length,
  });

  return {
    summary: {
      total: products.length,
      succeeded: succeeded.length,
      skipped,
      failed: failed.length,
    },
    succeeded,
    skipped: [],
    failed,
  };
}
