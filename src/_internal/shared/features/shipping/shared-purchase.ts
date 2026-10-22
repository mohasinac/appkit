/**
 * Shared purchase, S5a — one payer, N destinations.
 *
 * ## What this is, and what it deliberately is not
 *
 * The coordinator buys everything and assigns a destination per item, so one
 * paid order becomes N parcels. That is **~20% of the shared-purchase work for
 * most of its value** (the plan's own assessment), because it needs none of
 * the hard parts: no multi-party payment, no coordinator deposit, no approval
 * cascade, no per-buyer invoicing, no per-buyer GST, and no stock-reservation
 * primitive.
 *
 * 🛑 It is NOT S5b. There is exactly ONE payer and ONE place of supply, which
 * is what keeps the tax, the invoice and the refund path unchanged. The moment
 * a second person pays, every one of those becomes per-buyer and the design is
 * a different design.
 *
 * ## 🛑 Why the fees are SNAPSHOTTED, and the precedent that proves it
 *
 * A coordinator commits to a quoted total. If the handling fee or the
 * per-destination shipping is re-read at settle, a seller can raise it after
 * the quote and the coordinator absorbs the difference.
 *
 * The codebase already has this exact hole and this exact fix: the refund path
 * reads `finalSale` from the ORDER snapshot rather than the live product,
 * because — in its own words — "re-reading the live product would let a seller
 * flip the switch afterwards". D61 generalises it: *any agreement with a gap
 * between "terms agreed" and "money taken" must snapshot its terms at
 * agreement.*
 *
 * So `quoteSharedPurchase` takes the rates as ARGUMENTS and the caller
 * snapshots the result onto the order. There is no settings read in here.
 */

import { roundRupees } from "../../../../utils/number.formatter";

/** The two rates, read from the store document at quote time. */
export interface SharedPurchaseRates {
  allowSharedPurchase?: boolean;
  sharedPurchaseHandlingFee?: number;
  sharedPurchaseExtraShippingPerDestination?: number;
}

export interface SharedPurchaseQuoteInput {
  /**
   * Distinct destinations in this order group, INCLUDING the first.
   *
   * 🛑 A count of DISTINCT addresses, not of items. Three items to one address
   * is one parcel and no extra leg; two items to two addresses is two. Passing
   * an item count would charge a coordinator for splitting an order they did
   * not split.
   */
  destinationCount: number;
  /** The store's snapshotted rates. */
  rates: SharedPurchaseRates;
}

export interface SharedPurchaseQuote {
  /** True when this is actually a multi-destination order. */
  isShared: boolean;
  /** Flat handling fee, or 0. */
  handlingFee: number;
  /** Extra shipping for destinations beyond the first, or 0. */
  extraShippingFee: number;
  /** `handlingFee + extraShippingFee`, the figure added to the order total. */
  total: number;
  /**
   * Set when the arrangement cannot be priced — the seller allows it but has
   * not configured a rate.
   *
   * 🛑 The caller MUST act on this rather than treating the fee as ₹0. That is
   * D44 exactly: `shippingUnavailable` existed with its own docstring saying
   * "the caller MUST act on this rather than trusting `shippingFee: 0`", had
   * ZERO consumers, and an `estimate`-mode store shipped free on every path as
   * a result. An unpriced arrangement must be refused, not given away.
   */
  unpriced?: "handling" | "extra-shipping";
}

/**
 * Price a shared-purchase arrangement for ONE order group.
 *
 * Pure: no settings read, no Firestore, no clock. The rates come in, the
 * figure comes out, and the caller snapshots it.
 */
export function quoteSharedPurchase(
  input: SharedPurchaseQuoteInput,
): SharedPurchaseQuote {
  const none: SharedPurchaseQuote = {
    isShared: false,
    handlingFee: 0,
    extraShippingFee: 0,
    total: 0,
  };

  /*
   * One destination is an ordinary order. Checked BEFORE the allow flag, so a
   * seller who has not opted in is unaffected by this code path entirely —
   * rather than being refused an order they were always able to take.
   */
  const destinations = Math.max(1, Math.floor(input.destinationCount));
  if (destinations <= 1) return none;

  if (input.rates.allowSharedPurchase !== true) {
    /*
     * 🛑 Returns `isShared: false` rather than throwing, and the CALLER
     * refuses. This function prices; it does not authorise. A thrown error
     * here would be caught by a preview path and rendered as a broken page,
     * where the correct behaviour is to tell the buyer this seller does not
     * split orders.
     */
    return none;
  }

  const handling = input.rates.sharedPurchaseHandlingFee;
  const perExtra = input.rates.sharedPurchaseExtraShippingPerDestination;

  /*
   * 🛑 `undefined` is UNPRICED, not zero — see the `unpriced` field. A seller
   * who opted in without setting a rate has not agreed to do it for free, and
   * charging ₹0 would hand them the extra labour at their own cost silently.
   */
  if (typeof handling !== "number" || !Number.isFinite(handling)) {
    return { ...none, isShared: true, unpriced: "handling" };
  }
  if (typeof perExtra !== "number" || !Number.isFinite(perExtra)) {
    return { ...none, isShared: true, unpriced: "extra-shipping" };
  }

  const handlingFee = roundRupees(Math.max(0, handling));
  // BEYOND THE FIRST: the first destination's shipping is what the order would
  // have paid anyway, so only the marginal legs are charged here.
  const extraShippingFee = roundRupees(Math.max(0, perExtra) * (destinations - 1));

  return {
    isShared: true,
    handlingFee,
    extraShippingFee,
    total: roundRupees(handlingFee + extraShippingFee),
  };
}

/**
 * Distinct destinations across a set of lines.
 *
 * 🛑 Lines with NO `destinationAddressId` collapse into one bucket — the
 * order's own address — rather than counting as a destination each. Otherwise
 * an ordinary three-item order would look like three destinations and be
 * charged two extra legs.
 */
export function countDestinations(
  lines: readonly { destinationAddressId?: string }[],
): number {
  const ids = new Set<string>();
  let usesOrderAddress = false;
  for (const line of lines) {
    if (line.destinationAddressId) ids.add(line.destinationAddressId);
    else usesOrderAddress = true;
  }
  return ids.size + (usesOrderAddress ? 1 : 0);
}
