/**
 * Function #3 of the procurement-shipments cascade.
 *
 * Fires when a procurementShipments/{shipmentId} doc is deleted. Cascades
 * the batch-delete of that shipment's lots + items (looping in batches of
 * 500) so the Vercel DELETE route itself never has to touch more than the
 * shipment header doc — it stays fast regardless of how many thousands of
 * items the shipment had.
 */
import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";

type Doc = Record<string, JsonValue>;

const BATCH_LIMIT = 500;

async function purgeWhere(db: FirebaseFirestore.Firestore, collection: string, field: string, value: string): Promise<void> {
  for (;;) {
    const snap = await db.collection(collection).where(field, "==", value).limit(BATCH_LIMIT).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < BATCH_LIMIT) return;
  }
}

export const onShipmentDeletedHandler: FirestoreTriggerHandler<Doc, Doc> = async (event, ctx) => {
  if (event.after) return; // only act on deletion — this is bound as documentWritten (no documentDeleted trigger kind exists)
  const shipmentId = event.params.shipmentId;
  if (!shipmentId) return;

  await purgeWhere(ctx.db, "shipmentItems", "shipmentId", shipmentId);
  await purgeWhere(ctx.db, "shipmentLots", "shipmentId", shipmentId);

  ctx.logger.info("Cascade-deleted shipment lots + items", { shipmentId });
};
