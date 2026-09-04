/**
 * Cart line → order rows.
 *
 * A multi-member line (a bundle, or a buyer-assembled group selection) becomes
 * **N rows, one per member**, all sharing a `groupSlug`. Not one collapsed row.
 *
 * Why expand:
 *  - `hsnCode` and `gstRate` are per-PRODUCT, and a GST invoice legally needs
 *    HSN per line. A collapsed row can carry exactly one — which is why the
 *    collapsed bundle row has always carried none.
 *  - `cancelledQuantity` is per-product; partially cancelling one member of a
 *    three-item group is impossible on a collapsed row.
 *  - After per-member GST landed, `order.taxableAmount` is a sum over members.
 *    With one collapsed row it would not equal the sum of the order's own
 *    lines, and the invoice would visibly fail to add up.
 *
 * The buyer's receipt is unaffected: `groupOrderItemsByLine` collapses these
 * rows back under one header, which it was already written to do.
 */

import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { OrderDocumentItem } from "../../../../features/orders/schemas/firestore";
import { lineTotalFor, allocateAcrossMembers } from "../../../shared/checkout/order-math";
import { isFinalSale } from "../../../../features/products/constants/final-sale";

/** A row before rule decoration — the shape `decorateOrderItem` receives. */
export type BaseOrderLine = Omit<OrderDocumentItem, "listingType">;

/**
 * Expand one cart line into the order rows it should produce.
 *
 * A single-product line yields exactly one row, identical to before.
 *
 * For a BUNDLE the per-row `totalPrice` is a prorated share of the bundle's
 * locked price — never the member's list price — so the rows sum to what the
 * buyer actually pays. For a GROUP the member prices already are the price, so
 * the shares are exact.
 */
export function expandCartLineToOrderRows(
  item: CartItemDocument,
  representative: ProductDocument,
  productById: Map<string, ProductDocument>,
): BaseOrderLine[] {
  const members = item.groupMembers;
  const lineTotal = lineTotalFor(item, representative);

  if (!members?.length) {
    const gstFields =
      representative.gstRate != null
        ? {
            gstRate: representative.gstRate,
            ...(representative.hsnCode ? { hsnCode: representative.hsnCode } : {}),
          }
        : {};
    return [{
      productId: item.productId,
      productTitle: item.productTitle,
      image: item.productImage,
      quantity: item.quantity,
      unitPrice: lineTotal / (item.quantity || 1),
      totalPrice: lineTotal,
      // Snapshot the return terms the buyer is agreeing to right now. Resolved
      // through `isFinalSale` so this is always an explicit boolean, even
      // though the product field is optional and absent means true.
      finalSale: isFinalSale(representative),
      // Legacy collapsed bundle rows (no groupMembers) keep their old shape so
      // orders already in flight and their UI stay untouched.
      ...(item.bundleCategorySlug && item.bundleProductIds
        ? {
            bundleCategorySlug: item.bundleCategorySlug,
            bundleProductIds: item.bundleProductIds,
          }
        : {}),
      ...gstFields,
    }];
  }

  const groupSlug = item.groupSlug ?? item.bundleCategorySlug ?? item.groupId ?? item.itemId;
  const groupSource: OrderDocumentItem["groupSource"] =
    item.lineKind === "bundle" ? "bundle" : item.groupSource ?? "product-group";

  const shares = allocateAcrossMembers(
    lineTotal,
    members.map((m) => m.unitPrice * m.quantity),
  );

  return members.map((m, i) => {
    const product = productById.get(m.productId);
    const gstRate = product?.gstRate ?? m.gstRate;
    const hsnCode = product?.hsnCode ?? m.hsnCode;
    // Units of this member across all copies of the line.
    const quantity = m.quantity * item.quantity;
    const totalPrice = shares[i];
    return {
      productId: m.productId,
      productTitle: m.title,
      image: m.image ?? "",
      quantity,
      unitPrice: quantity > 0 ? totalPrice / quantity : totalPrice,
      totalPrice,
      // Per MEMBER, not per line: a bundle may mix a final-sale item with a
      // returnable one, and the refund gate reads each row separately so the
      // returnable member stays returnable.
      finalSale: isFinalSale(product),
      groupSlug,
      groupTitle: item.groupTitle ?? item.productTitle,
      groupSource,
      // Kept on bundle rows so the pre-existing receipt grouping (which keys on
      // this) keeps working for bundles without any UI change.
      ...(item.bundleCategorySlug ? { bundleCategorySlug: item.bundleCategorySlug } : {}),
      ...(gstRate != null ? { gstRate, ...(hsnCode ? { hsnCode } : {}) } : {}),
    };
  });
}
