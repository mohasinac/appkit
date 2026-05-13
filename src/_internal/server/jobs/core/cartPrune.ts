import { cartRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";
import { CART_TTL_DAYS } from "../handlers/messages";
import { batchDelete } from "../handlers/_helpers";

export async function runCartPrune(ctx: JobContext): Promise<void> {
  ctx.logger.info(`Pruning carts idle for > ${CART_TTL_DAYS} days`);
  const refs = await cartRepository.getStaleRefs(CART_TTL_DAYS);
  if (refs.length === 0) {
    ctx.logger.info("No stale carts found");
    return;
  }
  const deleted = await batchDelete(ctx, refs);
  ctx.logger.info("Cart prune complete", { deleted });
}
