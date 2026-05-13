import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleOrderStatusChange,
  type OrderAfter,
  type OrderBefore,
} from "../core/onOrderStatusChange";

export const onOrderStatusChangeHandler: FirestoreTriggerHandler<OrderBefore, OrderAfter> = async (
  event,
  ctx,
) => {
  await handleOrderStatusChange(
    { orderId: event.params.orderId, before: event.before, after: event.after },
    ctx,
  );
};
