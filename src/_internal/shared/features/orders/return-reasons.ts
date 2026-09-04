/**
 * Return / refund reasons, and which of them a FINAL SALE may refuse.
 *
 * ## Why a closed enum and not free text
 *
 * Before this, every return and refund path took `reason: z.string()`. The
 * seller-facing refund routes still recorded it, but `requestReturnAction`
 * parsed it and then dropped it on the floor — the field never reached
 * Firestore. So there was no stored answer to "why was this returned", and
 * nothing a gate could branch on.
 *
 * Final sale needs exactly that branch. "No returns, unless the buyer didn't
 * get what they paid for" is not a policy that can be enforced against a
 * free-text box: it needs a machine-readable statement of what went wrong.
 *
 * ## The split
 *
 * The exempt set is not "serious reasons" — it is **the reasons where the
 * buyer did not receive what the listing promised**. That is a claim about the
 * seller's performance of the contract, and no shop-level policy may waive it.
 * Everything in the blocked set is the buyer changing their mind about a thing
 * they did receive as described, which is exactly what final sale exists to
 * refuse.
 *
 * A reason is EXEMPT if the fault lies with the seller or the carrier.
 * A reason is BLOCKED (under final sale) if the fault lies with nobody.
 */

export const RETURN_REASON = [
  // ── Seller / carrier fault. Never blocked, whatever the listing says. ──
  "not_received",
  "not_as_described",
  "damaged_in_transit",
  "wrong_item_sent",
  "counterfeit_or_inauthentic",
  // ── Change of mind. Blocked when the line is final sale. ──
  "changed_mind",
  "ordered_by_mistake",
  "found_better_price",
  "no_longer_needed",
  "size_or_fit",
] as const;

export type ReturnReason = (typeof RETURN_REASON)[number];

/**
 * Reasons a final-sale listing can never refuse.
 *
 * 🛑 Adding a member to `RETURN_REASON` does NOT automatically add it here,
 * and that asymmetry is deliberate: a new reason defaults to BLOCKED under
 * final sale, which is the conservative direction — it can be appealed to
 * support, whereas a wrongly-exempt reason silently hands out refunds the
 * seller never agreed to. `RETURN_REASON_LABEL` below is a
 * `Record<ReturnReason, string>` precisely so a new member still cannot be
 * added without a deliberate decision about it.
 */
export const FINAL_SALE_EXEMPT_REASONS: ReadonlySet<ReturnReason> = new Set<ReturnReason>([
  "not_received",
  "not_as_described",
  "damaged_in_transit",
  "wrong_item_sent",
  "counterfeit_or_inauthentic",
]);

/**
 * Buyer-facing labels. `Record<ReturnReason, string>`, so a new reason is a
 * COMPILE error here rather than a select option rendering `undefined`.
 *
 * Lives beside the enum rather than in the component, matching `REFUND_COPY` —
 * these strings appear in the buyer form, the admin queue and the notification
 * body, and three copies of them would drift.
 */
export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  not_received: "It never arrived",
  not_as_described: "Not as described in the listing",
  damaged_in_transit: "Arrived damaged",
  wrong_item_sent: "The wrong item was sent",
  counterfeit_or_inauthentic: "Counterfeit or not authentic",
  changed_mind: "I changed my mind",
  ordered_by_mistake: "I ordered it by mistake",
  found_better_price: "I found a better price elsewhere",
  no_longer_needed: "I no longer need it",
  size_or_fit: "Size or fit is wrong",
};

/** Short grouping label, used to head the two option groups in the picker. */
export const RETURN_REASON_GROUP_LABEL = {
  fault: "Something was wrong with the order",
  changeOfMind: "I changed my mind",
} as const;

export function isFinalSaleExempt(reason: ReturnReason): boolean {
  return FINAL_SALE_EXEMPT_REASONS.has(reason);
}

export function isReturnReason(value: unknown): value is ReturnReason {
  return typeof value === "string" && (RETURN_REASON as readonly string[]).includes(value);
}

/** The reasons a buyer may pick for this order, given its final-sale lines. */
export function selectableReturnReasons(hasFinalSaleLine: boolean): readonly ReturnReason[] {
  return hasFinalSaleLine
    ? RETURN_REASON.filter(isFinalSaleExempt)
    : RETURN_REASON;
}
