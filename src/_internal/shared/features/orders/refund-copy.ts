/**
 * REFUND_COPY — all user-visible strings for refund + order-sibling UI.
 *
 * Single source of truth so copy changes don't require hunting across
 * RefundHistoryTable / RefundRequestView / OrderSiblingPayments.
 */

export const REFUND_COPY = {
  history: {
    heading: "Refund history",
    badgeFull: "Full refund",
    badgePartial: "Partial refund",
    labelTxn: "Txn:",
    labelRazorpay: "Razorpay:",
    nonContestableBanner:
      'Disputes, RMA requests, and "Item Not Received" claims are no longer available for this order.',
  },
  request: {
    orderTotalLabel: "Order total:",
    reasonLabel: "Reason for refund",
    reasonPlaceholder: "Describe the issue in at least 10 characters…",
    acknowledgeHeading: "Before submitting, please acknowledge:",
    submitLabel: "Request refund",
    submittingLabel: "Submitting…",
    errorFallback: "Failed to submit refund request",
    nonRefundableMessage:
      "This order is non-refundable (prize draw or bundle). Refunds cannot be issued.",
    alreadyRefundedMessage:
      "A refund has already been processed on this order. No further disputes or refund requests can be filed.",
    acknowledgments: [
      "I understand this refund request, once approved, permanently removes my ability to file any dispute or RMA claim on this order.",
      "I confirm the item has not been used, worn, or damaged by me, and I am returning it in original condition (if a return is required).",
      "I understand the refund amount may take 5–7 business days to reflect and that platform fees may be non-recoverable.",
    ] as const,
  },
  siblingPayments: {
    heading: (count: number) => `Other orders from this payment (${count})`,
  },
  shipping: {
    noOptions: "No shipping options available for this item.",
    freeLabel: "Free",
    etaFormat: (min: number, max: number) => `${min}–${max} days`,
  },
} as const;
