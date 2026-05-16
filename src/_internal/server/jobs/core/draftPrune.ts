import { productRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";
import { batchDelete } from "../handlers/_helpers";

const DRAFT_TTL_DAYS = 30;

export async function runDraftPrune(ctx: JobContext): Promise<void> {
  ctx.logger.info(`Pruning product drafts older than ${DRAFT_TTL_DAYS} days`);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DRAFT_TTL_DAYS);

  const refs = await productRepository.getStaleDraftRefs(cutoff);
  if (refs.length === 0) {
    ctx.logger.info("No stale drafts found");
    return;
  }
  const deleted = await batchDelete(ctx, refs);
  ctx.logger.info("Draft prune complete", { deleted });
}
