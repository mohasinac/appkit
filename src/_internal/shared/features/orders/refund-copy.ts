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
    labelPhonePe: "PhonePe:",
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
    /**
     * Shown when a final-sale line is in scope and the chosen reason is a
     * change-of-mind one. Deliberately names the reasons that ARE accepted —
     * a bare "final sale, request refused" reads as a dead end and generates a
     * support ticket, when in most cases the buyer simply picked the wrong
     * reason from the list.
     */
    finalSaleBlockedMessage:
      "This order includes a final-sale item, so it can't be returned for a change of mind. If it never arrived, arrived damaged, was the wrong item, wasn't as described, or is counterfeit, choose that reason instead and your request will go through.",
    finalSaleNoticeHeading: "This order includes a final-sale item",
    reasonSelectLabel: "What went wrong?",
    reasonSelectPlaceholder: "Choose a reason",
    reasonNoteLabel: "Anything else we should know? (optional)",
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
  /**
   * What to tell the buyer about the money, immediately after they cancel.
   *
   * 🛑 Here rather than inline in the route, because there are two cancel
   * endpoints plus the buyer's cancel page, and three copies of "we owe you
   * ₹X" is how a refund timeline comes to be published three different ways
   * (D20/D31). It is a function of the OUTCOME, so the sentence cannot
   * disagree with what actually happened — which is the specific failure D14
   * was: the page said one thing and the money did another.
   *
   * 🛑 It deliberately quotes **no timeline**. "5–7 business days" is published
   * in three contradicting places already and reconciling them is Phase 9; a
   * fourth statement of it here would be a new owner of a number that needs
   * fewer, not more.
   */
  cancellation: {
    message: (outcome: {
      moved: "none" | "gateway" | "owed";
      amount: number;
      why?: string;
    }): string => {
      if (outcome.moved === "gateway") {
        return `Order cancelled. A refund of ₹${outcome.amount.toFixed(2)} has been sent back to your original payment method.`;
      }
      if (outcome.moved === "owed") {
        return `Order cancelled. We owe you ₹${outcome.amount.toFixed(2)} — it needs to be sent manually, and our team has been notified.`;
      }
      /*
       * `none` splits two very different situations and must not blur them: an
       * unpaid order has nothing to refund, while an already-refunded one has
       * had its money returned. Telling the second buyer "no payment was
       * taken" would read as a denial that they ever paid.
       */
      return outcome.why === "nothing-refundable"
        ? "Order cancelled. Its payment had already been refunded in full, so nothing further is owed."
        : "Order cancelled. No payment had been taken, so there is nothing to refund.";
    },
  },
  shipping: {
    noOptions: "No shipping options available for this item.",
    freeLabel: "Free",
    etaFormat: (min: number, max: number) => `${min}–${max} days`,
  },
} as const;
