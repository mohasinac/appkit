import type { Order } from "../../../../features/orders/types";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

/**
 * 🛑 A date that is not a `Date` INSTANCE used to be silently dropped, and that
 * is not a hypothetical — it blanked the buyer's tracking page.
 *
 * The old body was `value instanceof Date ? value.toISOString() : undefined`,
 * and its parameter was typed `Date | undefined`, so TypeScript had no reason to
 * object: `OrderDocument` declares these fields as `Date`. What Firestore hands
 * back does not always agree. Measured end to end after a seller marked an order
 * shipped: the stored document carried
 * `shippingDate: "2026-09-29T09:06:22.381Z"` — an ISO **string**, because that is
 * what the ship write path stores — while `orderDate`, written at creation, was a
 * real `Date`. So the adapter mapped `orderDate` and dropped `shippingDate`, and
 * `/user/orders/[id]/track` rendered the Shipped step with an em-dash placeholder
 * beside a perfectly correct carrier and tracking number. Root Cause #57's shape:
 * one field lost in an adapter, presenting as a UI that looks merely incomplete.
 *
 * Three shapes are accepted because all three genuinely occur here: a `Date`, a
 * Firestore `Timestamp` (duck-typed on `toDate` rather than imported, so this
 * file stays free of a firebase-admin import — appkit Export Rules), and an ISO
 * string. Anything else, including an unparseable string, still yields
 * `undefined` — a wrong date is worse than a missing one, and the timeline is
 * built to render the em-dash honestly.
 */
function toIsoOrUndefined(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
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
        // Snapshotted tax terms. Without these the invoice cannot render an
        // HSN or a rate column — the SAME omission as `finalSale` above, one
        // field family over, and the reason the buyer-facing invoice showed
        // only Item / Qty / Price (Root Cause #57).
        ...(item.hsnCode ? { hsnCode: item.hsnCode } : {}),
        ...(item.gstRate != null ? { gstRate: item.gstRate } : {}),
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

  /*
   * 🛑 SUM THE ITEMS. Do not back it out of the total.
   *
   * This was `doc.totalPrice - shippingCost + discount`, which subtracts
   * shipping and adds back the discount — and ignores every other charge the
   * order carries: the platform fee, GST, the COD handling fee and deposit, and
   * the three per-store add-ons. With shipping and discount both zero, that
   * derivation returns the GRAND TOTAL, and the order page printed it on the
   * row labelled "Subtotal".
   *
   * Measured: an order whose items are ₹1,399.00 + ₹899.00 = ₹2,298.00
   * displayed "Subtotal ₹2,549.60 / Total ₹2,549.60" — a page that visibly does
   * not add up, on the document a buyer checks when they think they were
   * overcharged.
   *
   * The items are the authority: they are on the document, they carry their own
   * `totalPrice`, and they cannot drift out of step with the fee list the way a
   * subtraction must every time a fee is added. The old derivation survives only
   * as a fallback for documents with no items.
   */
  const itemsSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0,
  );
  const subtotal =
    items.length > 0 ? itemsSubtotal : doc.totalPrice - shippingCost + discount;

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
    /*
     * 🛑 `gstAmount` -> `tax`, and codHandlingFee alongside it.
     *
     * The comment four lines up is about exactly this and the same block still
     * dropped two fees. The invoice renders its GST line as
     * `order.tax !== undefined && order.tax > 0`, and nothing ever set `tax`,
     * so that line could never appear — Root Cause #57's silent "not
     * applicable" fallback, on a financial document.
     *
     * Measured on a real order: the invoice listed Subtotal ₹899.00 and
     * Shipping ₹77.00 against a stated Total of ₹997.80, leaving ₹21.80 with
     * nothing to explain it (₹10 platform fee + ₹10 WhatsApp updates +
     * ₹1.80 GST). An invoice whose lines do not sum to its own total is a
     * GST-compliance problem, not a cosmetic one.
     */
    tax: doc.gstAmount,
    /*
     * The rest of the breakdown. `tax` alone was all this adapter mapped, so
     * the invoice had one aggregate "Tax (GST)" row and no way to show a
     * CGST/SGST vs IGST split, a taxable value, or a per-rate table — i.e. it
     * could not be Rule 46-compliant no matter how it was rendered.
     */
    taxableAmount: doc.taxableAmount,
    exemptAmount: doc.exemptAmount,
    cgst: doc.cgst,
    sgst: doc.sgst,
    igst: doc.igst,
    gstByRate: doc.gstByRate,
    supplierGstin: doc.supplierGstin,
    supplierLegalName: doc.supplierLegalName,
    supplierAddress: doc.supplierAddress,
    codHandlingFee: doc.codHandlingFee,
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
