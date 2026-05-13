/**
 * Core: recompute avgRating + reviewCount on every published product
 * from approved reviews. Heals drift from partial writes / moderation changes.
 *
 * Concurrency capped at 5 to avoid Firestore read-rate spikes.
 */

import { productRepository, reviewRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

const CONCURRENCY = 5;

async function syncOne(productId: string): Promise<void> {
  const { count, avgRating } = await reviewRepository.getApprovedRatingAggregate(productId);
  await productRepository.update(productId, { avgRating, reviewCount: count });
}

export async function runProductStatsSync(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting product stats sync");
  const productIds = await productRepository.getPublishedIds();
  if (productIds.length === 0) {
    ctx.logger.info("No published products found");
    return;
  }
  ctx.logger.info(`Syncing stats for ${productIds.length} product(s)`);

  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < productIds.length; i += CONCURRENCY) {
    const slice = productIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(slice.map(syncOne));
    for (const r of results) {
      if (r.status === "fulfilled") succeeded++;
      else {
        failed++;
        ctx.logger.error("Failed to sync product stats", r.reason);
      }
    }
  }
  ctx.logger.info("Product stats sync complete", { succeeded, failed });
}
