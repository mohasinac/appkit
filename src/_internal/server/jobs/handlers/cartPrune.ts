import { cartRepository } from "../../../../repositories";
import type { ScheduleHandler } from "../runtime/types";
import { CART_TTL_DAYS } from "./messages";
import { batchDelete } from "./_helpers";

export const cartPruneHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info(`Pruning carts idle for > ${CART_TTL_DAYS} days`);
  const refs = await cartRepository.getStaleRefs(CART_TTL_DAYS);
  if (refs.length === 0) {
    ctx.logger.info("No stale carts found");
    return;
  }
  const deleted = await batchDelete(ctx, refs);
  ctx.logger.info("Cart prune complete", { deleted });
};
