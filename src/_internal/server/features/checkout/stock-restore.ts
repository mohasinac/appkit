import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import { ORDER_COLLECTION } from "../../../../features/orders/schemas/firestore";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ListingType } from "../../../../features/products/types/index";
import { getListingRule } from "../../../shared/checkout/rules";
import { getOrderItemMemberRefs } from "../../../shared/checkout/line-members";

/**
 * Per-product quantity to restore for one order — the inverse of
 * `getExpandedDecrements` (bundle-expansion.ts), but reads from
 * `OrderDocument.items` (post-checkout) rather than `CartItemDocument[]`
 * (pre-checkout). Nets out any partial per-item cancellation that already
 * happened (`cancelledQuantity`) so a previously-cancelled line isn't
 * double-restored.
 */
function getOrderRestoreMap(order: OrderDocument): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of order.items ?? []) {
    const remainingQty = item.quantity - (item.cancelledQuantity ?? 0);
    if (remainingQty <= 0) continue;
    // Must mirror `getExpandedDecrements` exactly, including the per-member
    // weighting — restoring fewer units than were taken silently leaks stock.
    for (const member of getOrderItemMemberRefs(item)) {
      const pid = member.productId;
      map.set(pid, (map.get(pid) ?? 0) + remainingQty * member.quantity);
    }
  }
  return map;
}

/**
 * Restores stock for a single order — increments `availableQuantity` (+ any
 * rule-specific counters, via the symmetric `stockIncrementExtras` hook) for
 * every product the order touched, then marks the order `stockRestored` so
 * a second call is a no-op. Call sites: the 15-min `paymentWindowTimeout`
 * sweep, the 24h `pendingOrderTimeout` sweep (COD), and
 * `adminRejectPaymentAsFraudAction`.
 *
 * Runs its own Firestore transaction — Firestore requires all reads before
 * any writes, so this cannot be folded into a caller's existing batch/
 * transaction that has already started writing. `extraOrderUpdate` lets the
 * caller's own order-cancellation fields (`status`, `cancellationReason`,
 * `cancellationDate`, ...) land in the SAME transaction as the stock
 * restore, so the two can never partially apply.
 */
export async function restoreStockForOrder(
  db: FirebaseFirestore.Firestore,
  order: OrderDocument & { id: string },
  extraOrderUpdate: Partial<OrderDocument>,
): Promise<void> {
  if (order.stockRestored) return;

  const restoreMap = getOrderRestoreMap(order);
  const orderRef = db.collection(ORDER_COLLECTION).doc(order.id);

  if (restoreMap.size === 0) {
    await orderRef.update({
      ...extraOrderUpdate,
      stockRestored: true,
      stockRestoredAt: new Date(),
    });
    return;
  }

  await db.runTransaction(async (tx) => {
    const productIds = [...restoreMap.keys()];
    const refs = productIds.map((pid) => db.collection(PRODUCT_COLLECTION).doc(pid));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

    for (const snap of snaps) {
      if (!snap.exists) continue;
      const product = snap.data() as ProductDocument;
      const qty = restoreMap.get(snap.id) ?? 0;
      if (qty <= 0) continue;
      const lt = (product.listingType ?? "standard") as ListingType;
      const rule = getListingRule(lt);
      tx.update(snap.ref, {
        availableQuantity: product.availableQuantity + qty,
        updatedAt: new Date(),
        ...rule.stockIncrementExtras(product, qty),
      });
    }

    tx.update(orderRef, {
      ...extraOrderUpdate,
      stockRestored: true,
      stockRestoredAt: new Date(),
    });
  });
}
