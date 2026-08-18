/**
 * Function #1 of the procurement-shipments cascade.
 *
 * Fires on any write to shipmentItems/{itemId}. Recomputes the owning lot's
 * item-derived aggregates (itemCount, mainItemsProjectedRevenue) by
 * summing all of that lot's items (bounded ≤500 — Firestore's own batch cap).
 * Writing those aggregates onto shipmentLots/{lotId} is what triggers
 * Function #2 (onShipmentLotWrite) to redo the cross-lot cost allocation.
 *
 * Skips the Firestore write entirely when nothing actually changed, so a
 * settled cascade doesn't loop forever re-triggering itself.
 */
import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";

type ItemDoc = Record<string, JsonValue>;

export const onShipmentItemWriteHandler: FirestoreTriggerHandler<ItemDoc, ItemDoc> = async (event, ctx) => {
  const lotId = (event.after?.lotId ?? event.before?.lotId) as string | undefined;
  if (!lotId) return;

  const itemsSnap = await ctx.db.collection("shipmentItems").where("lotId", "==", lotId).get();

  let mainItemsProjectedRevenue = 0;
  itemsSnap.docs.forEach((doc) => {
    const item = doc.data();
    if (item.isForSelfUse) return;
    const price = (item.price as number | undefined) ?? 0;
    const quantity = (item.quantity as number | undefined) ?? 0;
    mainItemsProjectedRevenue += price * quantity;
  });
  const itemCount = itemsSnap.size;

  const lotRef = ctx.db.collection("shipmentLots").doc(lotId);
  const lotSnap = await lotRef.get();
  if (!lotSnap.exists) return;
  const lot = lotSnap.data() ?? {};

  if (lot.itemCount === itemCount && lot.mainItemsProjectedRevenue === mainItemsProjectedRevenue) {
    return; // no-op — breaks the write→trigger→write cycle once settled
  }

  await lotRef.update({ itemCount, mainItemsProjectedRevenue, updatedAt: ctx.now });
  ctx.logger.info("Recomputed lot item aggregates", { lotId, itemCount, mainItemsProjectedRevenue });
};
