import type { Order } from "../../../../features/orders/types";
import type { OrderPlain } from "../../../../features/orders/schemas/firestore";

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

/**
 * 🛑 `OrderPlain`, not `OrderDocument` — this builds the BUYER-FACING shape.
 *
 * `orderRepository.findById` is ciphertext-by-default, so a signature taking
 * the raw document would invite a caller to hand over `enc:v1:` strings and
 * have them copied straight into an API response. The one caller
 * (`GET /api/user/orders/[id]`) already holds a revealed order; this makes the
 * signature say so.
 *
 * It does not currently read any of `ORDER_PII_FIELDS` (`userName`,
 * `userEmail`, `sellerEmail`), so nothing is leaking today — the point is that
 * adding one of them later is correct by default rather than a new leak.
 *
 * Accepted residue, stated rather than hidden: `Encrypted<string>` is
 * assignable to `string`, so a raw document still satisfies this structurally.
 * The brand forces the choice at the REPOSITORY boundary, which is where it
 * can actually be enforced; this parameter documents the expectation.
 */
export function orderDocumentToOrder(doc: OrderPlain): Order {
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
        /*
         * I8 — the TAXONOMY snapshot, which this adapter dropped.
         *
         * 🛑 Root Cause #57's exact shape, for the THIRD time in this one
         * mapper: the fields exist on the document, are deliberately
         * snapshotted at order time, and never reached any client. `finalSale`
         * and the tax pair above were each added after the same discovery.
         *
         * `categorySlug` has carried a reason since C1 — *"a product
         * re-categorised next year must not retroactively move last year's sale
         * into a band it was never part of"* — and no order surface could read
         * it. `categoryName` and `brand` are new, because a slug survives a
         * rename and a NAME is what a receipt has to show: the whole point of
         * snapshotting is that the record still reads correctly after the
         * category or product it came from is renamed or deleted.
         */
        ...(item.categorySlug ? { categorySlug: item.categorySlug } : {}),
        ...(item.categoryName ? { categoryName: item.categoryName } : {}),
        ...(item.brand ? { brand: item.brand } : {}),
        ...(item.condition ? { condition: item.condition } : {}),
        /*
         * The grouped-line keys. `groupOrderItemsByLine` collapses a bundle or
         * grouped cart line for the receipt and keys on exactly these — so
         * without them the client saw N separate rows where the buyer bought
         * one thing.
         */
        ...(item.groupSlug ? { groupSlug: item.groupSlug } : {}),
        ...(item.groupTitle ? { groupTitle: item.groupTitle } : {}),
        ...(item.groupSource ? { groupSource: item.groupSource } : {}),
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
    // the packer needs giftWrapMessage in hand. An
    // adapter that drops them makes every downstream surface render its
    // "not applicable" fallback instead (Root Cause #57).
    // EMI, so the buyer can see and pay their own schedule. Mapped with the
    // add-ons above for the same reason recorded there: an adapter that drops
    // a field makes every downstream surface render its not-applicable
    // fallback (Root Cause #57).
    emiEnabled: doc.emiEnabled,
    emiInstallments: doc.emiInstallments,
    emiRemainingBalance: doc.emiRemainingBalance,
    giftWrapAddon: doc.giftWrapAddon,
    giftWrapFee: doc.giftWrapFee,
    giftWrapMessage: doc.giftWrapMessage,
    shipmentProtectionAddon: doc.shipmentProtectionAddon,
    shipmentProtectionFee: doc.shipmentProtectionFee,
    saleProtectionAddon: doc.saleProtectionAddon,
    saleProtectionFee: doc.saleProtectionFee,
    platformFee: doc.platformFee,
    /*
     * D46/D47 — the points tender, mapped for the same reason as everything
     * above it and stated once more because this is the field most likely to
     * be dropped: it is optional, it is absent on every historical order, and a
     * surface that never receives it renders as though no points were used.
     *
     * That is Root Cause #57 exactly, and on this field it is not cosmetic —
     * the order page would show a buyer "Total ₹1,000" and a card statement
     * reading ₹750 with nothing on the page explaining the difference, which
     * reads as an overcharge rather than as their own discount.
     *
     * Readers must use `amountDue ?? total`, never a `?? 0`: absent means "no
     * points, the whole total was collected", and zero means free.
     */
    pointsApplied: doc.pointsApplied,
    amountDue: doc.amountDue,
    /*
     * Phase 7 — the invoice number, mapped for the same Root Cause #57 reason
     * as everything above. Unmapped, the buyer's invoice page would render a
     * statutory document with no number on it while the database held one, and
     * the only symptom would be a blank line where an auditor looks first.
     *
     * 🛑 `invoiceStoragePath` is deliberately NOT mapped. It is a raw Storage
     * path, and the client has no use for one — the bytes are served by an
     * authenticated route. Publishing the path into an RSC payload would hand
     * every buyer a string pointing at a private object, which is the shape of
     * Root Cause #70's leak even though the `private/` prefix is refused by
     * the proxy.
     */
    invoiceNumber: doc.invoiceNumber,
    invoiceIssuedAt: doc.invoiceIssuedAt
      ? new Date(doc.invoiceIssuedAt).toISOString()
      : undefined,
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
    /*
     * Completion, and the two anchors `OrderCompletionPanel` needs to decide
     * whether anything is contested.
     *
     * 🛑 Mapped in the SAME change as the client type, because the failure mode
     * of mapping neither — or one — is invisible. With `completedAt` undefined
     * the panel renders its rating UI forever and never confirms completion,
     * which reads as ordinary behaviour; with `returnRequestedAt` undefined it
     * offers "Mark complete" on an order with a live return, the server refuses
     * it, and the buyer gets an error for pressing a button we showed them.
     *
     * This is the field-by-field repeat of the manual-payment incident four
     * lines below: `paymentStatus` was mapped, nothing else payment-related
     * was, and the whole proof-upload flow was dead for every buyer while the
     * page politely said it did not apply.
     */
    completedAt: toIsoOrUndefined(doc.completedAt),
    completedBy: doc.completedBy,
    returnRequestedAt: toIsoOrUndefined(doc.returnRequestedAt),
    /*
     * A COUNT, not the events. The panel needs one bit — has any money already
     * moved — and `refunds[]` carries staff uids, gateway refund ids and
     * operator-facing reason strings. Publishing those to a buyer's page to
     * answer a yes/no question is the spread-and-publish shape (Root Cause #70).
     */
    refundCount: doc.refunds?.length ?? 0,
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
    /*
     * D55 — the pre-order balance, present only once a seller has opened it.
     *
     * 🛑 `reviewedBy` is deliberately NOT mapped. It is the reviewing staff
     * member's uid and no buyer surface reads it, so it stays server-side by
     * default (§ Public Data Projections — a field is private until someone
     * names the client that reads it).
     */
    balance: doc.balance
      ? {
          amount: doc.balance.amount,
          method: doc.balance.method,
          status: doc.balance.status,
          dueBy: toIsoOrUndefined(doc.balance.dueBy),
          proofUrl: doc.balance.proofUrl,
          transactionId: doc.balance.transactionId,
          submittedAt: toIsoOrUndefined(doc.balance.submittedAt),
          reviewedAt: toIsoOrUndefined(doc.balance.reviewedAt),
          reviewNote: doc.balance.reviewNote,
        }
      : undefined,
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
