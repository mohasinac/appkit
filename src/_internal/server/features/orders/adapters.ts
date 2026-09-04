import type { Order } from "../../../../features/orders/types";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

function toIsoOrUndefined(value: Date | undefined): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

export function orderDocumentToOrder(doc: OrderDocument): Order {
  const items: Order["items"] = doc.items?.length
    ? doc.items.map((item) => ({
        productId: item.productId,
        title: item.productTitle,
        image: item.image,
        price: item.unitPrice,
        quantity: item.quantity,
        currency: doc.currency,
        storeId: doc.storeId,
        // SB8-F — surface prize-draw reveal-state to the API response so
        // user-orders pages can render the "X reveals pending" badge.
        ...(item.listingType ? { listingType: item.listingType } : {}),
        ...(item.prizeRevealStatus
          ? { prizeRevealStatus: item.prizeRevealStatus }
          : {}),
        ...(item.cancelledQuantity != null
          ? { cancelledQuantity: item.cancelledQuantity }
          : {}),
        // Snapshotted return terms. Without this the buyer's return form
        // cannot tell a final-sale line from a returnable one and offers
        // every reason on every order (Root Cause #57).
        ...(item.finalSale != null ? { finalSale: item.finalSale } : {}),
      }))
    : [
        {
          productId: doc.productId,
          title: doc.productTitle,
          image: doc.imageUrls?.[0],
          price: doc.unitPrice,
          quantity: doc.quantity,
          currency: doc.currency,
          storeId: doc.storeId,
        },
      ];

  const address: Order["address"] = {
    id: doc.id,
    line1: doc.shippingAddress ?? "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  };

  const shippingCost = doc.shippingFee ?? 0;
  const discount = doc.couponDiscount ?? 0;
  const subtotal = doc.totalPrice - shippingCost + discount;

  return {
    id: doc.id,
    userId: doc.userId,
    items,
    address,
    orderStatus: doc.status,
    paymentStatus: doc.paymentStatus,
    // Which checkout lane produced this order (standard / auction / offer /
    // preorder / prize-draw). Drives the lane tabs on /user/orders. Absent on
    // orders written before `orderType` existed — every reader must treat a
    // missing value as "standard" rather than filtering it out.
    orderType: doc.orderType,
    offerId: doc.offerId,
    // Refund-eligibility fields. All three were declared on the document and
    // mapped nowhere, so every buyer-facing refund surface saw `undefined`.
    ...(doc.isNonRefundable != null ? { isNonRefundable: doc.isNonRefundable } : {}),
    ...(doc.contestable != null ? { contestable: doc.contestable } : {}),
    ...(doc.returnReasonCode ? { returnReasonCode: doc.returnReasonCode } : {}),
    ...(doc.returnReasonNote ? { returnReasonNote: doc.returnReasonNote } : {}),
    subtotal,
    shippingCost: shippingCost || undefined,
    discount: discount || undefined,
    total: doc.totalPrice,
    currency: doc.currency,
    couponCode: doc.couponCode,
    couponDiscount: doc.couponDiscount,
    appliedDiscounts: doc.appliedDiscounts,
    // Add-ons are operational, not decorative: the status-change notifier reads
    // whatsappNotifyAddon, and the packer needs giftWrapMessage in hand. An
    // adapter that drops them makes every downstream surface render its
    // "not applicable" fallback instead (Root Cause #57).
    whatsappNotifyAddon: doc.whatsappNotifyAddon,
    whatsappNotifyFee: doc.whatsappNotifyFee,
    giftWrapAddon: doc.giftWrapAddon,
    giftWrapFee: doc.giftWrapFee,
    giftWrapMessage: doc.giftWrapMessage,
    shipmentProtectionAddon: doc.shipmentProtectionAddon,
    shipmentProtectionFee: doc.shipmentProtectionFee,
    platformFee: doc.platformFee,
    trackingNumber: doc.trackingNumber,
    shippingCarrier: doc.shippingCarrier,
    trackingUrl: doc.trackingUrl,
    notes: doc.notes,
    orderDate: toIsoOrUndefined(doc.orderDate),
    shippingDate: toIsoOrUndefined(doc.shippingDate),
    deliveryDate: toIsoOrUndefined(doc.deliveryDate),
    cancellationDate: toIsoOrUndefined(doc.cancellationDate),
    autoApproved: doc.autoApproved,
    disputeRaised: doc.disputeRaised,
    disputeStatus: doc.disputeStatus,
    // Manual-payment (cash / UPI / EMI) passthrough. These were previously
    // dropped here, which silently disabled the entire buyer proof-upload
    // flow: `/user/orders/[id]/payment` branches on `paymentMethod` and so
    // rendered "this order does not require manual payment upload" for every
    // order, with no UPI ID and no countdown.
    paymentMethod: doc.paymentMethod,
    displayedUpiId: doc.displayedUpiId,
    paymentDeadline: toIsoOrUndefined(doc.paymentDeadline),
    paymentProofUrl: doc.paymentProofUrl,
    paymentProofUploadedAt: toIsoOrUndefined(doc.paymentProofUploadedAt),
    paymentTransactionId: doc.paymentTransactionId,
    buyerReportedUpiId: doc.buyerReportedUpiId,
    buyerMarkedPaid: doc.buyerMarkedPaid,
    paymentUpiMismatch: doc.paymentUpiMismatch,
    paymentReviewOutcome: doc.paymentReviewOutcome,
    paymentReviewNote: doc.paymentReviewNote,
    cancellationReason: doc.cancellationReason,
    // ── W2: history + provenance ──────────────────────────────────────────
    //
    // `Order.timeline` has existed, been exported, and had ZERO writers since
    // it was declared — `OrderStatusTimeline` synthesised its steps from four
    // scalar dates instead, so a status change with no dedicated date field
    // (payment reviewed, refund posted) was simply invisible.
    //
    // `statusHistory` is that field's real source. Dates are serialised to
    // ISO here for the same reason every other date on this shape is: the
    // client receives JSON, and a raw `Date` arrives as a string that no
    // longer satisfies the type.
    timeline: doc.statusHistory?.map((entry) => ({
      at: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
      actorUid: entry.actorUid,
      actorRole: entry.actorRole,
      changes: entry.changes,
      reason: entry.reason,
      note: entry.note,
      trigger: entry.trigger,
    })),
    /** Entries trimmed off the front — so the UI never implies "this is all of it". */
    timelineTruncated: doc.statusHistoryTruncated,
    /** How the buyer acquired the right to buy. Written once, at creation. */
    sourceContext: doc.sourceContext,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
    ...(doc.prizeWon
      ? {
          prizeWon: {
            ...doc.prizeWon,
            wonAt:
              doc.prizeWon.wonAt instanceof Date
                ? doc.prizeWon.wonAt.toISOString()
                : String(doc.prizeWon.wonAt),
          },
        }
      : {}),
    ...(doc.prizeDrawProductId ? { prizeDrawProductId: doc.prizeDrawProductId } : {}),
    ...(doc.prizeRevealMode ? { prizeRevealMode: doc.prizeRevealMode } : {}),
  };
}
