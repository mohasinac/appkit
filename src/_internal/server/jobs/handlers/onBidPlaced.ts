import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleBidPlaced, type NewBid } from "../core/onBidPlaced";

export const onBidPlacedHandler: FirestoreTriggerHandler<null, NewBid> = async (event, ctx) => {
  const newBid = event.after;
  if (!newBid) {
    ctx.logger.error("No snapshot data", null);
    return;
  }
  await handleBidPlaced({ bidId: event.params.bidId, bid: newBid }, ctx);
};
