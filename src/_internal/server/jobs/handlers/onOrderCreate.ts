import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleOrderCreate, type NewOrder } from "../core/onOrderCreate";

export const onOrderCreateHandler: FirestoreTriggerHandler<null, NewOrder> = async (event, ctx) => {
  const order = event.after;
  if (!order) {
    ctx.logger.error("No snapshot data", null);
    return;
  }
  await handleOrderCreate({ orderId: event.params.orderId, order }, ctx);
};
