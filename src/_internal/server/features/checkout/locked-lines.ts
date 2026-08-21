/*
 * WHY: A "locked line" is a cart line whose price was fixed outside the listing —
 *      an accepted offer or a won auction. Two things were missing before
 *      2026-08-21: the offer/bid was never re-checked at ORDER time (only at
 *      add-to-cart time, so a line could sit in the cart past its deadline and
 *      still check out), and nothing ever closed the loop afterwards — the
 *      offer stayed "accepted" forever and could be re-added and re-ordered,
 *      and a won bid had no link to the order it became.
 * WHAT: `assertLockedLinesStillValid` (pre-order-creation guard) and
 *       `finalizeLockedLines` (post-order-creation close-out). Both are called
 *       from every order-creation path so the manual/COD and Razorpay flows
 *       cannot diverge.
 *
 * EXPORTS:
 *   assertLockedLinesStillValid, finalizeLockedLines
 *
 * @tag domain:checkout,offers,auctions
 * @tag layer:server-action
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:checkout/actions.ts
 * @tag sideEffects:firestore-write
 */

import { offerRepository } from "../../../../features/seller/repository/offer.repository";
import { bidRepository } from "../../../../repositories";
import { OfferStatusValues } from "../../../../features/seller/schemas";
import { ValidationError } from "../../../../errors";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import { activeLane, laneOf, laneBlockReason } from "../../../shared/checkout/lanes";

/**
 * Refuse a checkout that isn't the cart's active lane.
 *
 * The client scopes its selection to one lane's tab, but a selection is just a
 * list of item ids in a request body — nothing stopped a caller from checking
 * out their ₹200 standard items while a ₹30,000 auction win they already
 * committed to sat unpaid. Priority is enforced here, on the server, over the
 * WHOLE cart, not over the caller-supplied subset.
 */
export function assertCheckoutLane(
  allCartItems: readonly CartItemDocument[],
  selectedItems: readonly CartItemDocument[],
): void {
  const active = activeLane(allCartItems);
  if (!active) return;

  const offLane = selectedItems.filter((item) => laneOf(item) !== active);
  if (offLane.length === 0) return;

  throw new ValidationError(
    laneBlockReason(allCartItems, laneOf(offLane[0])) ??
      "Please complete your outstanding items first.",
    { code: CHECKOUT_LANE_BLOCKED },
  );
}

/** Error code the client maps to a lane-aware message. */
export const CHECKOUT_LANE_BLOCKED = "CHECKOUT_LANE_BLOCKED";

/**
 * Re-validate every locked line immediately before the order is written.
 *
 * `checkoutOffer()` already checks status/deadline/stock when the line is ADDED
 * to the cart, but nothing re-checked at order time — so a buyer could add an
 * accepted offer, wait out the 48h window, and still be charged the locked
 * price. Throws on the first invalid line; the caller's transaction aborts.
 */
export async function assertLockedLinesStillValid(
  items: readonly CartItemDocument[],
  buyerUid: string,
): Promise<void> {
  const now = new Date();

  for (const item of items) {
    if (!item.offerId) continue;
    const offer = await offerRepository.findById(item.offerId);
    if (!offer) {
      throw new ValidationError(
        "The offer for one of your items no longer exists. Remove it and try again.",
      );
    }
    if (offer.buyerUid !== buyerUid) {
      throw new ValidationError("This offer belongs to a different account.");
    }
    if (offer.status !== OfferStatusValues.ACCEPTED) {
      throw new ValidationError(
        offer.status === OfferStatusValues.PAID
          ? "This offer has already been used for an order."
          : "This offer is no longer accepted. Remove it from your cart and make a new offer.",
      );
    }
    if (offer.checkoutDeadline && now > offer.checkoutDeadline) {
      throw new ValidationError(
        "The checkout window for this accepted offer has expired. Please make a new offer.",
      );
    }
  }
}

/**
 * Close the loop after the order exists.
 *
 * Best-effort by design: the order is already persisted and paid-for, so a
 * failure here must be logged rather than thrown — losing the back-link is a
 * bookkeeping problem, refusing a completed order is a customer-facing one.
 */
export async function finalizeLockedLines(
  items: readonly CartItemDocument[],
  orderId: string,
): Promise<void> {
  for (const item of items) {
    if (item.offerId) {
      try {
        await offerRepository.markPaid(item.offerId, orderId);
      } catch (err) {
        void normalizeError(err);
        serverLogger.error("finalizeLockedLines: markPaid failed", {
          offerId: item.offerId,
          orderId,
        });
      }
    }
    if (item.bidId) {
      try {
        await bidRepository.attachOrder(item.bidId, orderId);
      } catch (err) {
        void normalizeError(err);
        serverLogger.error("finalizeLockedLines: attachOrder failed", {
          bidId: item.bidId,
          orderId,
        });
      }
    }
  }
}
