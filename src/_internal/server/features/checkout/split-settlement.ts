/*
 * WHY: A split capture pays the seller out of the aggregator's escrow, so the
 *      platform never holds their share — and therefore nothing in our own
 *      records would otherwise show that they were paid at all. Two things
 *      depend on there being a record:
 *
 *        1. the SELLER has to be able to see what they were paid and why;
 *        2. the orders this capture produces must not ALSO be swept into a
 *           manual payout. `getPaidOutOrderIds` counts `pending`, `processing`
 *           and `paid`, and `OrderDocument.splitSettlement` is stamped at
 *           settle from the rows written here — both guards read this write.
 *
 * WHAT: The one place a `payouts` row is created for a share the GATEWAY
 *       settled, written at capture, where the instruction is known exactly.
 *
 * ## 🛑 WRITTEN AT CAPTURE, NOT AT SETTLE, AND THAT IS THE POINT
 *
 * The capture request is the only one that holds the vendor registrations and
 * the exact per-vendor amounts it sent. The settle request runs later, against
 * a cart that can have changed in between — which is why
 * `verifyAndPlaceGatewayOrderAction` carries a settlement-compliance detector
 * rather than trusting its own recomputation. Writing the record here and
 * READING it there means the order states the amount that was instructed, not
 * one recomputed from different inputs.
 *
 * ## 🛑 `orderIds: []`, deliberately and unavoidably
 *
 * The orders do not exist yet: they are created after the buyer completes
 * payment, in a different request. An empty array is the honest shape — the
 * join is `settlementReference`, which is the capture's own merchant order id
 * and is carried onto every order this capture produces as `paymentId`. It is
 * stated here because `getPaidOutOrderIds` reads `orderIds` and will therefore
 * find nothing in these rows: the order-side guard
 * (`OrderDocument.splitSettlement` + `orderNeedsManualPayout`) is what actually
 * prevents the double payment, and it must not be removed on the belief that
 * this row covers it.
 *
 * EXPORTS: resolveCaptureSplit, recordSplitSettlementPayouts,
 *          type CaptureSplitInput, type CaptureSplitGroupInput,
 *          type ResolvedCaptureSplit, type SplitSettlementPayoutInput
 *
 * @tag domain:checkout,payments,payouts
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:api/payment/create-order
 * @tag sideEffects:writes payouts
 */

import { payoutRepository, storeRepository, userRepository } from "../../../../repositories";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { getDefaultCurrency } from "../../../../core/baseline-resolver";
import type { FeeCommissionRates } from "../../../shared/fees/calculator";
import { commissionRecordRates } from "../../../shared/checkout/order-math";
import {
  buildSplitInstructions,
  vendorSettlementForGroup,
  type BuiltSplitInstructions,
  type SplitCandidateGroup,
  type SplitSettlementLine,
} from "../../../shared/checkout/settlement-split";
import type { SplitInstruction } from "../../../../contracts/payment";
import type { StoreSettlementVendor } from "../../../../features/stores/schemas/firestore";

export interface CaptureSplitGroupInput {
  /** The order splitter's own key. One store per group, by construction. */
  storeId: string;
  lines: readonly SplitSettlementLine[];
  /** Buyer points redeemed against THIS group, in rupees. */
  pointsFunded: number;
  /**
   * This store's vendor registrations, per gateway, exactly as
   * `resolveShippingCost` returns them — from the store read it already
   * performs, so the caller pays no extra Firestore read (Rule #6).
   */
  settlementVendors?: Record<string, StoreSettlementVendor>;
}

export interface CaptureSplitInput {
  /** The gateway that will collect, i.e. `provider.name`. */
  gateway: string;
  /** `siteSettings.payment.platformStoreId`. Unset ⇒ every store is third-party. */
  platformStoreId?: string | null;
  commissions: FeeCommissionRates;
  groups: readonly CaptureSplitGroupInput[];
}

export interface ResolvedCaptureSplit extends BuiltSplitInstructions {
  /** The candidate groups, keyed by store — what `recordSplitSettlementPayouts` needs. */
  groupByStore: Map<string, SplitCandidateGroup>;
}

/**
 * The per-vendor split for ONE capture, resolved from figures the caller has
 * already computed.
 *
 * ## 🛑 Nothing here re-derives a money rule
 *
 * The amounts go through `vendorSettlementForGroup` →
 * `computePayoutDeduction` — the identical function both payout sweeps use — so
 * what the aggregator is told to settle and what we would otherwise have paid
 * are the same arithmetic. The GROUPING is the caller's, from
 * `splitCartIntoOrderGroups`, which is the only grouping in the system (Root
 * Cause #65/#75).
 *
 * ## 🛑 The platform's OWN store is never split out
 *
 * Its stock settles into the platform's own account, which is where it belongs
 * and is the reason a platform-only cart needs no splitting gateway at all. A
 * split instruction naming our own store would ask the aggregator to pay us out
 * of its escrow.
 *
 * 🛑 Measured against the SETTING, never the `PLATFORM_STORE_ID` constant.
 * Unset means every store is third-party — the same fail-closed input
 * `cartVendorComposition` uses — because a hardcoded brand literal must not
 * make an authorisation decision for every install of this package (see that
 * constant's own 🛑).
 *
 * 🛑 It RETURNS a refusal list rather than throwing, so the caller can build
 * the message and keep the refusal before any payment session exists. A
 * non-empty `blocked` MUST refuse the capture; "split what we can" leaves the
 * rest in the platform's account, which is the commingling.
 *
 * Pure — no IO, no clock. The reads happened in the caller.
 */
export function resolveCaptureSplit(input: CaptureSplitInput): ResolvedCaptureSplit {
  const platformStoreId = input.platformStoreId?.trim() ? input.platformStoreId.trim() : null;
  const groupByStore = new Map<string, SplitCandidateGroup>();
  for (const group of input.groups) {
    groupByStore.set(group.storeId, {
      storeId: group.storeId,
      lines: group.lines,
      pointsFunded: group.pointsFunded,
      /*
       * 🛑 The registration for THE GATEWAY THAT WILL COLLECT, not whichever
       * one happens to be first. A store can be registered with one aggregator
       * and not another, and settling against the wrong registration is a split
       * instruction naming a vendor the collecting gateway has never heard of.
       */
      vendor: group.settlementVendors?.[input.gateway] ?? null,
      isPlatformStore: platformStoreId !== null && group.storeId === platformStoreId,
    });
  }
  const built = buildSplitInstructions([...groupByStore.values()], input.commissions);
  return { ...built, groupByStore };
}

export interface SplitSettlementPayoutInput {
  /** The gateway that collected and split, e.g. `"cashfree"`. */
  gateway: string;
  /** Our own merchant order id for the capture — the join key to the orders. */
  merchantOrderId: string;
  /** Exactly what was sent to the gateway. */
  splits: readonly SplitInstruction[];
  /** The same groups the splits were built from, by `storeId`. */
  groupByStore: ReadonlyMap<string, SplitCandidateGroup>;
  commissions: FeeCommissionRates;
}

/**
 * Record each vendor's instructed share as a `processing` payout.
 *
 * 🛑 BEST-EFFORT, PER VENDOR, and never allowed to fail the capture. The
 * payment session already exists by the time this runs; throwing here would
 * leave the buyer unable to pay for a cart that was lawfully collectable, which
 * is strictly worse than a missing bookkeeping row. Each failure is reported
 * loudly — a seller whose settlement was not recorded still gets paid by the
 * aggregator, but our own books and the double-payment guard are then both
 * short, so this must show up as a pattern rather than as silence (Root Cause
 * #59).
 *
 * 🛑 It reads the OWNER to name the payee, which is one Firestore read per
 * third-party vendor. That is deliberate against Rule #6's budget: a payout row
 * with no payee name or email is unreadable in the seller's own list and
 * unsearchable in the admin's (`buildTokensIndexFor` derives
 * `sellerTokensIndex` from exactly those two fields). A multi-vendor cart is
 * rare and N is small.
 *
 * 🛑 `revealUser`, never the raw document. `UserRepository` is
 * ciphertext-by-default, and `createPayout`-family writes re-encrypt
 * `sellerEmail` — so passing the stored value would store
 * ciphertext-of-ciphertext and make `sellerEmailIndex` unmatchable. The
 * identical note is on both payout sweeps.
 */
export async function recordSplitSettlementPayouts(
  input: SplitSettlementPayoutInput,
): Promise<void> {
  const currency = getDefaultCurrency();

  for (const split of input.splits) {
    const group = input.groupByStore.get(split.storeId);
    if (!group) {
      serverLogger.error(
        "recordSplitSettlementPayouts: a split instruction has no matching order group — the settlement was NOT recorded",
        { merchantOrderId: input.merchantOrderId, storeId: split.storeId },
      );
      continue;
    }
    try {
      const { taxableValue, deduction } = vendorSettlementForGroup(group, input.commissions);
      const store = await storeRepository.findById(split.storeId);
      const owner = store?.ownerId ? await userRepository.findById(store.ownerId) : null;
      const ownerPlain = owner ? userRepository.revealUser(owner) : null;

      await payoutRepository.createSplitSettlementPayout({
        payeeType: "store",
        storeId: split.storeId,
        // `displayName` is plaintext by D1; the email fallback must be revealed.
        sellerName:
          (owner?.displayName ?? ownerPlain?.email ?? store?.storeName ?? split.storeId) as string,
        sellerEmail: ownerPlain?.email ?? "",
        /*
         * 🛑 `orderIds: []` — the orders do not exist yet. See the header: the
         * join is `settlementReference`, and the double-payment guard is on the
         * ORDER, not here.
         */
        orderIds: [],
        amount: deduction.netAmount,
        grossAmount: taxableValue,
        platformFee: deduction.platformFee,
        gatewayFee: deduction.gatewayFee,
        gstAmount: deduction.gstOnFee,
        /*
         * The three rate fields, from one helper so this writer cannot drift
         * from the payout sweeps. Its `gstRate` is GST on our COMMISSION, not
         * the buyer's tax on the goods — see the helper.
         */
        ...commissionRecordRates(input.commissions),
        currency,
        /*
         * The destination the AGGREGATOR will use, which is the one the seller
         * registered with. Falls back to bank transfer when the owner cannot be
         * read — the field is required and a wrong label on a settlement we did
         * not make is cosmetic, whereas failing the capture is not.
         */
        paymentMethod:
          ownerPlain?.payoutDetails?.method === "upi" ? "upi" : "bank_transfer",
        /*
         * 🛑 The UPI id is NOT copied onto this row. A manual payout row carries
         * it because an admin reads it to make the transfer; nobody will ever
         * dispatch this one, and a settled destination duplicated here is PII
         * at rest for no reader. Same argument as the real `accountNumber`
         * never being copied onto a payout.
         */
        notes:
          `Settled directly to the seller by ${input.gateway} out of the payment ` +
          `for ${input.merchantOrderId}. Not a manual payout — do not dispatch.`,
        settlementGateway: input.gateway,
        settlementVendorId: split.vendorId,
        settlementReference: input.merchantOrderId,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      serverLogger.error(
        "recordSplitSettlementPayouts: could not record a gateway settlement — the seller WILL still be paid by the gateway, but our books and the double-payment guard are short for this store",
        {
          merchantOrderId: input.merchantOrderId,
          storeId: split.storeId,
          vendorId: split.vendorId,
          error: normalized.message,
        },
      );
    }
  }
}
