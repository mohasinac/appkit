/**
 * The order status machine — which transitions are legal.
 *
 * ## 🛑 THIS MAP WAS BUILT FROM A CENSUS, NOT FROM A DESIGN
 *
 * The plan that called for it said "~32 writers and no `from` check anywhere,
 * so inventing the map silently breaks working flows — the failure mode is a
 * legitimate admin action that now throws." That is the right fear and it is
 * why a read-only census came first. **What the census found contradicted the
 * plan's own number**, which is worth recording:
 *
 * `orderRepository.updateStatus` has **four** callers, not thirty-two:
 *
 *   1. `_internal/server/features/orders/actions.ts:99` — hardcodes
 *      `"return_requested"`, cast `as any`.
 *   2. `_internal/server/features/orders/actions.ts:113` — passes
 *      `parsed.data.status` straight through, cast `as any`.
 *   3. `src/app/api/store/orders/[id]/route.ts:242` — passes `data.status`
 *      from the SELLER's request body.
 *   4. `features/admin/actions/admin-actions.ts:152`.
 *
 * 🛑 **And the finding that matters: two of those four accept an arbitrary
 * status from a request body, both with `as any` silencing the one type-level
 * signal there was.** So a seller PATCHing their own order could set
 * `delivered` on an unpaid order, or regress `delivered` → `pending`, and
 * nothing anywhere would refuse it. The "~32 writers" framing made this look
 * like a sprawling refactor; it is four call sites and a guard.
 *
 * (The other ~30 hits a naive grep returns are `offer.repository.ts`'s OWN
 * `updateStatus` — a different method on a different collection. Conflating
 * them is how the estimate got to 32, and acting on it would have meant
 * "fixing" the offer lifecycle by accident.)
 *
 * ## Three entries look wrong and are not
 *
 * - **`return_requested` → `delivered`.** A REJECTED return must go back to
 *   its prior terminal state, not strand the order in a requested-return limbo
 *   forever. Without this the seller's "no, this is not a valid return" has no
 *   expressible outcome.
 * - **`cancelled` → `refunded` and `returned` → `refunded`.** Money moves
 *   AFTER the goods decision. `refunded` is the only genuinely terminal state;
 *   `cancelled` is a goods outcome that may still owe money.
 * - **`pending` → `refunded` is ABSENT.** A pending order was never captured,
 *   so there is nothing to refund. If a writer is found doing this, the writer
 *   is the bug — do not widen the map to accommodate it.
 */

import type { OrderStatus } from "../types/index";

/**
 * Legal next states per status. A `Record<OrderStatus, …>` so a tenth status
 * cannot be added to the union without declaring where it can go — an array or
 * a `Record<string, …>` catches neither mistake, which is how ten independent
 * enumerations of `ListingType` came to disagree (Root Cause #61).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "return_requested", "cancelled", "refunded"],
  delivered: ["return_requested", "refunded"],
  return_requested: ["returned", "delivered", "refunded", "cancelled"],
  returned: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

/*
 * Two entries beyond the plan's proposed map, and they have DIFFERENT
 * justifications — which is worth separating, because one is evidence and the
 * other is caution.
 *
 * **`pending → processing` — VERIFIED.** `paymentReviewAutoApprove.ts:66`
 * writes `status: "processing"` on a pending order, and
 * `checkout/actions.ts:1210` creates one directly as `PROCESSING` under the
 * admin bypass. The plan's proposed map omitted this hop, so adopting the plan
 * verbatim would have made the 2-hour auto-approve sweep start throwing — the
 * exact "a legitimate flow now fails" regression the census existed to prevent.
 * The census wins, as the plan instructed.
 *
 * 🛑 **`shipped → cancelled` — NOT verified, permissive by choice.** I wrote a
 * comment claiming the census justified this via an RTO flow, then checked: the
 * only grep hits were that comment and an unused `RTO_ENTRY_CUSTODY` constant.
 * No writer produces it today. It is kept because the asymmetry of harm is
 * one-sided — being too permissive here allows a transition nothing currently
 * makes, while being too strict would break a dispatch-then-cancel flow the
 * moment one is built — but it is a JUDGEMENT, not a measurement, and the next
 * person should know which is which.
 */

/** Statuses from which nothing may follow. */
export const ORDER_TERMINAL_STATUSES: readonly OrderStatus[] = ["refunded"];

export function isLegalOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  /*
   * A no-op write is always legal. Re-writing the same status happens all the
   * time — a patch that touches `trackingNumber` and re-sends the status it
   * already had — and refusing it would break those writers for no gain.
   */
  if (from === to) return true;
  return (ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/** Human-readable refusal, for the error a caller sees. */
export function describeIllegalTransition(from: OrderStatus, to: OrderStatus): string {
  const allowed = ORDER_STATUS_TRANSITIONS[from] ?? [];
  return allowed.length === 0
    ? `An order in "${from}" is terminal — it cannot move to "${to}".`
    : `An order in "${from}" cannot move to "${to}". Allowed: ${allowed.join(", ")}.`;
}
