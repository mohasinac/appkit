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
import {
  ORDER_ITEM_DESCRIPTION_MAX,
  ORDER_ITEM_SPECIFICATIONS_MAX,
  type OrderDocumentItem,
} from "../../../../features/orders/schemas/firestore";
import { lineTotalFor, allocateAcrossMembers } from "../../../shared/checkout/order-math";
import { isFinalSale } from "../../../../features/products/constants/final-sale";

/** A row before rule decoration — the shape `decorateOrderItem` receives. */
/**
 * The listing text as it read at purchase, bounded.
 *
 * 🛑 `description` is seller prose on every line of every order, and
 * `items[]` is inline on a document Firestore caps at 1 MiB. Unbounded, a
 * 20-line order is a REJECTED WRITE AT CHECKOUT — failing the one operation
 * that must never fail for a reason the buyer cannot act on.
 *
 * Truncation is RECORDED rather than silent, for the same reason
 * `statusHistoryTruncated` exists: a short description and a cut one must not
 * read alike, or a dispute argues over text nobody can tell was clipped.
 *
 * `specifications` is capped by COUNT rather than characters — it is a table,
 * and a half-row is worse than a missing one.
 */
type ListingSnapshot = Pick<
  OrderDocumentItem,
  "description" | "descriptionTruncated" | "specifications"
>;

function listingSnapshot(
  p:
    | {
        description?: string;
        specifications?: Array<{ name: string; value: string; unit?: string }>;
      }
    | null
    | undefined,
): ListingSnapshot {
  if (!p) return {};
  /*
   * 🛑 A named Pick, not `Record<string, unknown>`. A bag of unknowns
   * type-checks against anything, so a misspelled key — `descriptionTruncted`
   * — would compile, spread onto the order line, and simply never be read.
   * The field would look set and the truncation flag would be missing from
   * every row (`audit-unknown-leakage` blocks exactly this).
   */
  const out: ListingSnapshot = {};
  const desc = typeof p.description === "string" ? p.description.trim() : "";
  if (desc) {
    out.description = desc.slice(0, ORDER_ITEM_DESCRIPTION_MAX);
    if (desc.length > ORDER_ITEM_DESCRIPTION_MAX) out.descriptionTruncated = true;
  }
  if (p.specifications?.length) {
    out.specifications = p.specifications.slice(0, ORDER_ITEM_SPECIFICATIONS_MAX).map((x) => ({
      name: x.name,
      value: x.value,
      ...(x.unit ? { unit: x.unit } : {}),
    }));
  }
  return out;
}

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
      /*
       * 🛑 The LEAF category, snapshotted — beside `hsnCode`, `gstRate` and
       * `finalSale`, and for the same reason the first two are here.
       *
       * `OrderDocumentItem` carried no taxonomy field at all (`bundleCategorySlug`
       * is a bundle key, not a category), so `priceIndexRollup` could only find
       * a sale's category by joining every order item back to its product — a
       * full products scan per run, and nothing at all for an item whose
       * product has since been deleted.
       *
       * Snapshotting makes the join disappear for every future order. And a
       * snapshot is the CORRECT answer rather than merely the cheap one: a
       * product re-categorised next year must not retroactively move last
       * year's sale into a band it was never part of.
       *
       * `categorySlugs[0]` is the leaf — the chain is stored self-first — and
       * a sale rolls up to exactly one leaf, so there is nothing to
       * double-count.
       */
      ...(representative.categorySlugs?.[0]
        ? { categorySlug: representative.categorySlugs[0] }
        : {}),
      /*
       * I8 — the category and brand DISPLAY NAMES, beside the slug.
       *
       * `categoryNames[0]` is the default leaf's name, parallel to
       * `categorySlugs[0]`. Snapshotted for the reason the slug alone is not
       * enough: a slug survives a rename, but a receipt has to show a NAME, and
       * re-resolving it at render time would let a renamed category change what
       * a past invoice says.
       */
      ...(representative.categoryNames?.[0]
        ? { categoryName: representative.categoryNames[0] }
        : {}),
      ...(representative.brand ? { brand: representative.brand } : {}),
      ...(representative.listingType ? { listingType: representative.listingType } : {}),
      ...(representative.condition ? { condition: representative.condition } : {}),
      // I9 — the physical variant, for the price index's colourway slice.
      ...(representative.colourway ? { colourway: representative.colourway } : {}),
      /* Part 14 — what the listing SAID, which is what a dispute argues over. */
      ...listingSnapshot(representative),
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
      /*
       * Per MEMBER, like `finalSale` and the GST pair above it — a bundle
       * genuinely spans categories, and attributing every member's sale to the
       * bundle's own leaf would put a ₹1,299 bey's realised price into a
       * sticker leaf's band.
       *
       * Falls back to the cart-line member snapshot when the product has since
       * been deleted, which is the whole reason that snapshot exists.
       */
      ...(product?.categorySlugs?.[0] ? { categorySlug: product.categorySlugs[0] } : {}),
      // I8 - the same snapshot per member. `product` may be gone by order time,
      // which is exactly why the member snapshot exists, so both are guarded.
      ...(product?.categoryNames?.[0] ? { categoryName: product.categoryNames[0] } : {}),
      ...(product?.brand ? { brand: product.brand } : {}),
      ...(product?.listingType ? { listingType: product.listingType } : {}),
      // Per MEMBER — a bundle can mix a sealed item with a loose one, and a
      // blended condition would describe neither.
      ...(product?.condition ? { condition: product.condition } : {}),
      ...(product?.colourway ? { colourway: product.colourway } : {}),
      /* Per MEMBER, same as condition above: a bundle can mix a sealed item
       * with a loose one, and one blended description would describe neither. */
      ...listingSnapshot(product),
      ...(gstRate != null ? { gstRate, ...(hsnCode ? { hsnCode } : {}) } : {}),
    };
  });
}
