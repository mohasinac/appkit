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
import {
  supportsSurpriseReveal,
  supportsDeferredFulfilment,
  hasInstantFulfillment,
  supportsShipping,
} from "../../listing-types/capabilities";

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
 * Concealable lifecycle: the baseline, plus ONE additional lock — reveal.
 *
 * **Cancellable while UNREVEALED, and not a moment longer.** Confirmation does
 * NOT lock it; reveal does. Owner, 2026-11-07: *"it can be cancelled till the
 * reveal status is not true; once revealed it will be uncancellable and
 * non-refundable."*
 *
 * One predicate covers BOTH clearance modes, which is why it is expressed this
 * way rather than as two rules:
 *
 *   · **immediate reveal** — contents are revealed on the order-details page
 *     once payment succeeds (not at checkout). The item is therefore `revealed`
 *     from the outset, so this rule locks it immediately. Correct: the buyer
 *     did not gamble on anything they can now back out of.
 *   · **surprise / delayed reveal** — stays `unrevealed`, and so stays
 *     cancellable, until the buyer reveals at their discretion OR the seller
 *     ships (shipment auto-reveals, making the allocation public).
 *
 * 🛑 An earlier version of this rule also required `status === "pending"`. That
 * was too strict and is corrected here — it would have stopped a buyer
 * cancelling an unrevealed surprise order after confirmation, which the owner
 * explicitly allows.
 *
 * Claims for "what arrived is not what was revealed" are deliberately NOT
 * modelled here — that is the existing item-not-as-described claim type in
 * support, adjudicated against the immutable allocation record.
 */
function concealableRule(): OrderWorkflowRule {
  const base = standardRule();
  return {
    cancellableByBuyer: (ctx) =>
      base.cancellableByBuyer(ctx) && ctx.revealState !== "revealed",
    cancelBlockedReason: (ctx) => {
      const baseReason = base.cancelBlockedReason(ctx);
      if (baseReason) return baseReason;
      if (ctx.revealState === "revealed") {
        return "Revealed items cannot be cancelled or refunded — you were warned before revealing.";
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

// ---------------------------------------------------------------------------
// Fulfilment mode — the `fulfilment` slot of the registry shape
// ---------------------------------------------------------------------------

/**
 * How a paid line actually gets delivered.
 *
 *   `"ship"`            — a parcel moves; the shipment IS the fulfilment event
 *   `"instant-digital"` — completes with no human action when payment lands
 *   `"manual-digital"`  — waits for an explicit release by the seller/staff
 *   `"none"`            — nothing to fulfil (local handover, chat-only types)
 */
export type FulfilmentMode = "ship" | "instant-digital" | "manual-digital" | "none";

/**
 * The per-listing half of the fulfilment decision.
 *
 * Structurally typed rather than importing `ProductDocument`, so this module
 * stays dependency-light and the same call works from a product, a cart line
 * or an order line that only carries the meta it needs.
 */
export interface FulfilmentOptIn {
  digitalCode?: { codeDeliveryMethod?: "auto-claim" | "manual-email" } | null;
}

/**
 * Resolve the fulfilment mode for a line. **Call this instead of comparing a
 * listing type to a string at a fulfilment site.**
 *
 * ## 🛑 The defect this closes
 *
 * `digitalCode.codeDeliveryMethod` is seller-settable (`"auto-claim" |
 * "manual-email"`), is in the seller form, is validated by the request schema,
 * and **two seeded products already carry `"manual-email"`** — but it had no
 * reader on any fulfilment path. Checkout decided with
 * `listingType === "digital-code"` and auto-claimed a code regardless, so a
 * seller who chose manual release got instant issue anyway. The setting looked
 * implemented and did nothing.
 *
 * ## Two levels, as everywhere else
 *
 * `supportsDeferredFulfilment` (type CAN wait for a human) × the per-listing
 * opt-in (this seller CHOSE to). Deferring without the capability is ignored
 * rather than honoured — a type with no release action and no pending state
 * would otherwise strand a paid order with nothing able to complete it. A flag
 * that cannot be acted on must not change behaviour.
 *
 * Enabling manual release on another type is then a capability-row edit plus
 * that type's own opt-in flag; this function does not change.
 */
export function fulfilmentModeFor(
  type: ListingType | undefined,
  listing?: FulfilmentOptIn | null,
): FulfilmentMode {
  const t = type ?? "standard";
  if (supportsShipping(t)) return "ship";
  if (
    supportsDeferredFulfilment(t) &&
    listing?.digitalCode?.codeDeliveryMethod === "manual-email"
  ) {
    return "manual-digital";
  }
  if (hasInstantFulfillment(t)) return "instant-digital";
  return "none";
}

/**
 * Does this line complete on its own the moment payment lands?
 *
 * The predicate a checkout/payment path should gate auto-fulfilment on. `false`
 * for a manual-release line, which is the whole point — and it is expressed
 * positively so the call site reads as a capability question rather than as
 * "not one of these types".
 */
export function fulfilsOnPayment(
  type: ListingType | undefined,
  listing?: FulfilmentOptIn | null,
): boolean {
  return fulfilmentModeFor(type, listing) === "instant-digital";
}

/** Does this line need a release action from a human before it is delivered? */
export function awaitsManualRelease(
  type: ListingType | undefined,
  listing?: FulfilmentOptIn | null,
): boolean {
  return fulfilmentModeFor(type, listing) === "manual-digital";
}

/**
 * Must checkout collect a shipping address for this line?
 *
 * The `requiresShippingAddress` slot of the registry shape, derived from the
 * `supportsShipping` capability rather than stored twice — two booleans that
 * can disagree about whether an address is needed is a checkout that either
 * blocks a digital purchase or ships a code to nowhere.
 */
export function requiresShippingAddress(type: ListingType | undefined): boolean {
  return fulfilmentModeFor(type) === "ship";
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
