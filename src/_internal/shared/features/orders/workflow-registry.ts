/**
 * Order workflow registry — per-listing-type lifecycle rules as DATA.
 *
 * ## Why this exists
 *
 * Order behaviour already differs per listing type, but those differences live
 * as scattered `if (listingType === ...)` conditionals. That is the same defect
 * the capability registry exists to fix, and it has already produced a
 * documented failure mode once: the `ListingType` union's own comment records
 * 21 named branch sites of which only 11 are compile-checked, with two already
 * drifted when it was written.
 *
 * So the rules become a table, and every guard reads from it. The acceptance
 * test is that no order/refund code compares `listingType` to a string literal.
 *
 * ## 🛑 The gap this closes
 *
 * `ORDER_CANCELLABLE_STATUSES = ["pending", "confirmed"]` lets a buyer cancel a
 * CONFIRMED order. For a surprise/clearance item that contradicts the stated
 * rule — "once it is confirmed or shipped, it is no more changed", and once it
 * ships, is revealed, or reaches customs, "it cannot be refunded or cancelled
 * by any party unless done by the admin".
 *
 * A blanket status list cannot express that, because the lock depends on BOTH
 * the order status AND the item's reveal state. Hence a predicate per type
 * rather than a constant.
 *
 * ## Deliberately NOT here
 *
 * Admin override. Admin may act on a locked order by design, and that path is
 * audited separately — folding it in here would make every predicate take an
 * actor and obscure the buyer-facing rule this file is about.
 */

import type { ListingType } from "../../../../features/products/types/index";
import { supportsSurpriseReveal } from "../../listing-types/capabilities";

/** Lifecycle position, mirroring `OrderStatus` without importing the union. */
export type WorkflowStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "return_requested"
  | "returned";

/**
 * Whether a concealed item has been opened.
 *
 * Lives on the ORDER ITEM, never the product: two buyers of the same product
 * are in different states, and the transition is what gates refund eligibility.
 */
export type RevealState = "unrevealed" | "revealed";

export interface OrderWorkflowContext {
  status: WorkflowStatus;
  /** Absent for types that cannot conceal — see `supportsSurpriseReveal`. */
  revealState?: RevealState;
  /** True once a carrier or customs holds the goods; locks everything. */
  inCustody?: boolean;
}

export interface OrderWorkflowRule {
  /** May the BUYER still cancel? Admin override is out of scope — see header. */
  cancellableByBuyer: (ctx: OrderWorkflowContext) => boolean;
  /** Why not, for a UI that should explain rather than grey a button out. */
  cancelBlockedReason: (ctx: OrderWorkflowContext) => string | null;
}

/** Statuses after which nothing is buyer-cancellable, for ANY type. */
const TERMINAL_OR_IN_FLIGHT: ReadonlySet<WorkflowStatus> = new Set([
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "return_requested",
  "returned",
]);

/**
 * Baseline retail lifecycle: cancellable until the seller starts acting on it.
 *
 * Note this KEEPS `confirmed` cancellable, matching today's behaviour for
 * ordinary goods. Only concealable types tighten it, and they tighten it for a
 * stated reason rather than as a blanket policy change.
 */
function standardRule(): OrderWorkflowRule {
  return {
    cancellableByBuyer: (ctx) =>
      !ctx.inCustody && !TERMINAL_OR_IN_FLIGHT.has(ctx.status),
    cancelBlockedReason: (ctx) => {
      if (ctx.inCustody) return "The parcel is already with the carrier or customs.";
      if (TERMINAL_OR_IN_FLIGHT.has(ctx.status)) {
        return "This order has moved past the point where it can be cancelled.";
      }
      return null;
    },
  };
}

/**
 * Concealable lifecycle: the baseline, PLUS two locks.
 *
 * 1. Revealing forfeits cancellation. The buyer has seen the allocation, so
 *    allowing a cancel after that is a free option on the contents.
 * 2. Confirmation locks it, per the owner's rule. For an ordinary item
 *    `confirmed` is still cancellable; for a concealed one it is not.
 */
function concealableRule(): OrderWorkflowRule {
  const base = standardRule();
  return {
    cancellableByBuyer: (ctx) =>
      base.cancellableByBuyer(ctx) &&
      ctx.revealState !== "revealed" &&
      ctx.status === "pending",
    cancelBlockedReason: (ctx) => {
      const baseReason = base.cancelBlockedReason(ctx);
      if (baseReason) return baseReason;
      if (ctx.revealState === "revealed") {
        return "Revealed items cannot be cancelled — this was shown before you revealed.";
      }
      if (ctx.status !== "pending") {
        return "Confirmed surprise orders cannot be cancelled.";
      }
      return null;
    },
  };
}

/**
 * Resolve the rule for a listing type.
 *
 * Keyed off the CAPABILITY, not the type name — so enabling surprise on another
 * type is a capability-table edit and this file needs no change. That is the
 * governing principle applied to order rules.
 */
export function workflowRuleFor(type: ListingType): OrderWorkflowRule {
  return supportsSurpriseReveal(type) ? concealableRule() : standardRule();
}

/** Convenience: may the buyer cancel this line? */
export function canBuyerCancel(
  type: ListingType,
  ctx: OrderWorkflowContext,
): boolean {
  return workflowRuleFor(type).cancellableByBuyer(ctx);
}

/**
 * Whole-order cancellability.
 *
 * 🛑 Deliberately the AND of every line, not the OR. A buyer cancelling a mixed
 * order containing one revealed surprise item must not take the whole order
 * with it — the strictest line governs. Partial cancellation is a separate
 * feature, not something to fall out of a loose predicate here.
 */
export function canBuyerCancelOrder(
  lines: ReadonlyArray<{ listingType?: ListingType; ctx: OrderWorkflowContext }>,
): boolean {
  if (lines.length === 0) return false;
  return lines.every((l) =>
    l.listingType ? canBuyerCancel(l.listingType, l.ctx) : standardRule().cancellableByBuyer(l.ctx),
  );
}
