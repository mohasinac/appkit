/*
 * WHY: `settlement.ts` decides WHICH gateway may collect a cart. This decides
 *      WHAT each seller's share of that one capture is, so the aggregator can
 *      settle it to them directly and the platform never holds it.
 *
 *      Those are two halves of one rule and they are deliberately separate
 *      files: the gateway choice is a refusal that must land before a payment
 *      session exists, while this is arithmetic that has to agree, to the
 *      rupee, with what the seller would otherwise have been paid.
 *
 * WHAT: Per-vendor split instructions for one capture, built from figures the
 *       caller has already computed, through `computePayoutDeduction` — the
 *       SAME function the weekly and automatic payout sweeps use.
 *
 * ## 🛑 NOTHING HERE RE-DERIVES A MONEY RULE
 *
 * Root Cause #75 is one money predicate hand-written in six places. So:
 *
 *   · the GROUPING is `storeId`, which is what `splitCartIntoOrderGroups`
 *     already keys on and what every rule's `splitKey` is already scoped to.
 *     This file takes groups; it does not make them.
 *   · the COMMISSION is `computePayoutDeduction` — platform fee + gateway fee
 *     + GST-on-fee, deliberately uncapped, which is the SELLER-side figure and
 *     not the buyer-facing capped one.
 *   · the TAXABLE BASE is `taxableFromInclusive` per line, which is exactly
 *     what `orderTaxableValue` does, down to the `?? 0` default (see below).
 *
 * ## 🛑 THE SPLIT CANNOT EQUAL THE EVENTUAL PAYOUT EXACTLY, AND THAT IS A REAL GAP
 *
 * `computePayoutDeduction` takes two terms that DO NOT EXIST at capture time:
 *
 *   · `shippingReimbursement` — postage refunded to the seller. It reads
 *     `shippingReimbursement.approvedAmount`, an explicit admin decision made
 *     after dispatch, and its own docstring says an absent value means "nothing
 *     is payable YET", not "nothing is owed". At capture there is no parcel and
 *     no decision, so this file passes 0.
 *   · `pointsAwarded` — the earn side of the points programme, which is
 *     computed when the order ships. Only the REDEEM side (`pointsApplied`) is
 *     known at capture, and that is the half passed here.
 *
 * So a split settles the GOODS, and a residue (postage owed TO the seller,
 * points-earn owed FROM them) is decided later and is not expressible in a
 * capture-time instruction. **That residue has no settlement path and this
 * change does not invent one** — inventing a charge flow is explicitly out of
 * scope. What this file guarantees is that the residue is the ONLY difference,
 * because every other term goes through the same function as the payout.
 *
 * ## 🛑 THE PLATFORM'S OWN SHARE IS NEVER SPLIT OUT
 *
 * `cartVendorComposition` already answers "which of these stores is ours". The
 * platform's own stock settles into the platform's own account, which is where
 * it belongs and is the whole reason a platform-only cart needs no splitting
 * gateway at all. A split instruction naming the platform's own store would be
 * asking an aggregator to pay us out of our own escrow.
 *
 * EXPORTS:
 *   SPLIT_UNSETTLEABLE_CODE, SplitSettlementLine, SplitCandidateGroup,
 *   BuiltSplitInstructions, SplitBlockedStore, VendorSettlement,
 *   vendorSettlementForGroup, buildSplitInstructions, splitRefusalReason,
 *   orderNeedsManualPayout
 *
 * @tag domain:checkout,payments,payouts
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:api/payment/create-order,server/features/checkout
 * @tag sideEffects:none
 */

import type { SplitInstruction } from "../../../contracts/payment";
import { linesTaxableValue, type TaxableLineLike } from "./order-math";
import { rupeesToPaise } from "../../../core/money";
import {
  computePayoutDeduction,
  type FeeCommissionRates,
  type PayoutDeduction,
} from "../fees/calculator";

/** The code every refusal from this module carries. */
export const SPLIT_UNSETTLEABLE_CODE = "SPLIT_SETTLEMENT_UNAVAILABLE";

/**
 * One cart line's contribution to a group's taxable value.
 *
 * 🛑 An ALIAS of `TaxableLineLike` rather than its own shape, so the split and
 * the payout sweeps cannot drift apart. They must agree to the rupee — a
 * seller paid one amount and shown another is the failure this file exists to
 * prevent — and `linesTaxableValue` and `orderTaxableValue` now share the one
 * per-line rule, including the `?? 0` default. Defaulting to
 * `DEFAULT_GST_RATE` here instead would diverge for exactly the listings that
 * carry no rate.
 *
 * `lineTotal` is the tax-INCLUSIVE line total, from `lineTotalFor` — never
 * `price × quantity`.
 */
export type SplitSettlementLine = TaxableLineLike;

export interface SplitCandidateGroup {
  /** The order splitter's own key. One store per group, by construction. */
  storeId: string;
  lines: readonly SplitSettlementLine[];
  /**
   * Buyer points redeemed against THIS group, in rupees.
   *
   * Decisions 3 and 17: the accepting store funds the redemption, so it is a
   * deduction from their share. Passed per group because a cart spanning an
   * accepting and a declining store must not pool it.
   */
  pointsFunded?: number;
  /**
   * This store's vendor registration with the COLLECTING gateway, or `null`
   * when it has none.
   *
   * 🛑 `status` is read as a string and compared against `"active"` only.
   * Anything else — `pending`, `rejected`, `blocked`, a value this file has
   * never seen — is NOT settleable, which is the fail-closed direction: a split
   * built against an unapproved vendor is money the aggregator will either
   * refuse or hold, and a refusal mid-capture is worse than a refusal before
   * one.
   */
  vendor?: { vendorId: string; status: string } | null;
  /**
   * Is this the platform's OWN store?
   *
   * Resolved by the caller from `siteSettings.payment.platformStoreId`, the
   * same input `cartVendorComposition` measures against — never from the
   * `PLATFORM_STORE_ID` constant, which answers product questions and would be
   * a hardcoded brand literal making an authorisation decision (see that
   * constant's own 🛑).
   */
  isPlatformStore: boolean;
}

export interface SplitBlockedStore {
  storeId: string;
  /** Operator- and buyer-facing: names what is missing, not that something is. */
  reason: string;
}

export interface BuiltSplitInstructions {
  /** One per third-party store with an `active` vendor. Smallest currency unit. */
  splits: SplitInstruction[];
  /**
   * Third-party stores whose share CANNOT be settled directly.
   *
   * 🛑 A non-empty list must REFUSE the capture. It must never be treated as
   * "split what we can and collect the rest" — the rest is another seller's
   * money landing in the platform's account, which is the commingling, and it
   * presents as a completely successful checkout.
   */
  blocked: SplitBlockedStore[];
}

export interface VendorSettlement {
  /** The commission base — goods only, GST backed out, exactly as `orderTaxableValue`. */
  taxableValue: number;
  /** Every term, so the `payouts` record can state them rather than one net figure. */
  deduction: PayoutDeduction;
}

/**
 * What ONE seller is owed out of this capture, with every term.
 *
 * Returns the whole breakdown rather than the net figure, for the reason
 * `PayoutDeduction`'s own docstring gives: *"'₹951 goods less ₹10 fee plus ₹80
 * postage' is a sentence; one net figure is not."* The split instruction uses
 * `deduction.netAmount`; the `payouts` row records all of it, so a seller
 * looking at a short settlement can see which term shortened it.
 *
 * Exported for the same reason `computePayoutDeduction` is: a second
 * hand-rolled copy of this is Root Cause #75.
 */
export function vendorSettlementForGroup(
  group: SplitCandidateGroup,
  commissions: FeeCommissionRates,
): VendorSettlement {
  /*
   * Through `linesTaxableValue` rather than backed out here, so the split and
   * the payout sweeps cannot disagree: they now read ONE per-line rule. See
   * that function's note on why the read belongs in `order-math.ts`.
   */
  const taxableValue = linesTaxableValue(group.lines);
  /*
   * 🛑 `0` for the postage reimbursement, and the comment is the point: it is
   * not "we decided zero", it is "no parcel exists yet and no admin has
   * approved anything". See this file's header for the residue that creates.
   */
  const deduction = computePayoutDeduction(
    taxableValue,
    commissions,
    0,
    group.pointsFunded ?? 0,
  );
  return { taxableValue, deduction };
}

/**
 * Split instructions for one capture, plus every store that blocks it.
 *
 * 🛑 Returns rather than throws, so the caller can build the refusal message
 * AND disable the affordance from the same answer — the rule
 * `blockedMethodsForCart` and `resolveCollectingGatewayForCart` both already
 * follow. The refusal sentence has one definition, `splitRefusalReason`.
 */
export function buildSplitInstructions(
  groups: readonly SplitCandidateGroup[],
  commissions: FeeCommissionRates,
): BuiltSplitInstructions {
  const splits: SplitInstruction[] = [];
  const blocked: SplitBlockedStore[] = [];

  for (const group of groups) {
    // The platform's own stock settles into the platform's own account. See the
    // header — splitting it out would ask the aggregator to pay us from escrow.
    if (group.isPlatformStore) continue;

    const vendor = group.vendor;
    if (!vendor?.vendorId) {
      blocked.push({
        storeId: group.storeId,
        reason:
          `this seller is not yet registered with the payment provider that would ` +
          `collect, so their share cannot be paid straight to them`,
      });
      continue;
    }
    if (vendor.status !== "active") {
      blocked.push({
        storeId: group.storeId,
        reason:
          `the payment provider has not finished approving this seller ` +
          `(status: ${vendor.status || "unknown"}), so their share cannot be paid ` +
          `straight to them yet`,
      });
      continue;
    }

    const shareRupees = vendorSettlementForGroup(group, commissions).deduction.netAmount;
    if (shareRupees <= 0) {
      /*
       * A zero share on a third-party group is not a vendor to skip — it means
       * the deductions consumed the whole sale, which on a real order is either
       * a pricing fault or a points redemption larger than the net. Refusing
       * names it; sending a ₹0 split or silently omitting the vendor would
       * collect the full amount into the platform's account.
       */
      blocked.push({
        storeId: group.storeId,
        reason:
          `this seller's share of the payment works out to nothing after fees, ` +
          `so there is nothing to settle to them and the payment cannot be split`,
      });
      continue;
    }

    splits.push({
      vendorId: vendor.vendorId,
      storeId: group.storeId,
      // 🛑 Smallest currency unit, matching `createOrder`'s own `amount`. The
      // adapter converts to whatever the gateway wants, in one place.
      amount: rupeesToPaise(shareRupees),
    });
  }

  return { splits, blocked };
}

/**
 * The buyer-facing sentence for a cart that cannot be split.
 *
 * 🛑 It names the REMEDY, which is the whole reason the blocked list carries a
 * reason per store rather than a count: "this seller is not set up to be paid
 * directly yet" tells a buyer to order from them later or pay another way,
 * while "payment unavailable" tells them to try again forever.
 */
export function splitRefusalReason(blocked: readonly SplitBlockedStore[]): string {
  if (blocked.length === 0) return "";
  const first = blocked[0];
  const others =
    blocked.length > 1
      ? ` (and ${blocked.length - 1} other seller${blocked.length > 2 ? "s" : ""})`
      : "";
  return (
    `This cart can't be paid for online yet: ${first.reason}${others}. ` +
    `Remove that seller's items and order them separately, or use a direct ` +
    `bank/UPI transfer or cash on delivery where it is offered.`
  );
}

/** The one field `orderNeedsManualPayout` reads. */
export interface SplitSettledOrderLike {
  splitSettlement?: { vendorId?: string } | null;
}

/**
 * Does this order still owe the seller a payout WE have to make?
 *
 * 🛑 THE DOUBLE-PAYMENT GUARD, and it is not optional. An order whose seller
 * share was split-settled at capture has already been paid by the aggregator;
 * if it then enters `payoutStatus: "eligible"` the weekly and automatic sweeps
 * create a `payouts` row for the FULL share and the seller is paid twice —
 * once from escrow and once from the platform's own balance, which is the
 * commingling in reverse and costs real money.
 *
 * 🛑 Gated on the ORDER's own snapshot, never on the store's current vendor
 * record. A store that is registered today says nothing about how an order
 * placed last month was collected, and a store whose registration was later
 * revoked must not retroactively re-acquire a payout for money it has already
 * received (Root Cause #42 — a mirror read late is a mirror that disagrees).
 */
export function orderNeedsManualPayout(order: SplitSettledOrderLike): boolean {
  return !order.splitSettlement?.vendorId;
}
