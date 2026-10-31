/*
 * Cashfree EASY SPLIT — the vendor and per-vendor-share surface.
 *
 * Split out of `index.ts` rather than left in it for two reasons, and the
 * second is the one that matters:
 *
 *   1. that file reached the 1,000-line `max-lines` ceiling;
 *   2. **everything in here is SPECIFIED, NOT CONFIRMED** — see the block
 *      below — and isolating it means correcting any assumption is an edit to
 *      one named thing in one file, with no call-site changes.
 *
 * `audit-payment-provider-import` allowlists `payment-cashfree/**`, so a
 * sibling module here is as legitimate as `index.ts` itself.
 *
 * EXPORTS: EASY_SPLIT_VENDORS_PATH, ORDER_SPLITS_FIELD,
 *          MAX_SPLIT_VENDORS_PER_ORDER, mapCashfreeVendorStatus,
 *          cashfreeVendorPayload, toOrderSplits, CashfreeVendorEntity
 */

import type {
  SettlementVendorInput,
  SettlementVendorOutcome,
  SplitInstruction,
} from "../../contracts";
import { paiseToRupees } from "../../core/money";

/**
 * The Easy Split vendor entity, naming only what is mapped.
 *
 * 🛑 `status` is read as an opaque string and narrowed by
 * `mapCashfreeVendorStatus`, never exhaustively switched. The value set belongs
 * to Cashfree and an unrecognised one must resolve to "do not split yet"
 * rather than to a guess — see that function.
 */
export interface CashfreeVendorEntity {
  vendor_id?: string;
  status?: string;
  /** Present on some error shapes; carried into the result message when it is. */
  message?: string;
}


/*
 * 🛑🛑 EVERYTHING IN THIS SECTION IS SPECIFIED, NOT CONFIRMED.
 *
 * Easy Split is a separately-onboarded Cashfree product and none of the three
 * facts below has been exercised against the live API or re-read from Cashfree's
 * current documentation. Each one can be wrong INDEPENDENTLY of the others, and
 * each has a different failure mode:
 *
 *   1. THE VENDOR ENDPOINT AND ITS BODY (`cashfreeVendorPayload` /
 *      `EASY_SPLIT_VENDORS_PATH`). Wrong path or wrong field names → a 4xx at
 *      registration. LOUD and harmless: the job records `rejected` with
 *      Cashfree's own message and no money has moved.
 *
 *   2. THE SPLIT FIELD ON THE ORDER (`ORDER_SPLITS_FIELD`, `toOrderSplits`).
 *      This is the DANGEROUS one. A wrong field name is not necessarily an
 *      error — Cashfree may ignore an unknown key — and the order would then be
 *      created and CAPTURED with no split at all. That is a completely
 *      successful-looking checkout which has just collected other sellers'
 *      money into the platform's own account: the exact RBI commingling this
 *      whole mechanism exists to prevent. **Before the first real rupee goes
 *      through this path, create one sandbox order with a split and read the
 *      split back off the order entity.** An order that reports no split is the
 *      proof this is wrong; an order that errors is the benign outcome.
 *
 *   3. HOW MANY VENDORS ONE ORDER MAY CARRY
 *      (`MAX_SPLIT_VENDORS_PER_ORDER`). See its own 🛑 — this is the open
 *      question the whole multi-vendor cart shape depends on.
 *
 * All three are isolated here so that correcting any of them is an edit to one
 * named thing with no call-site changes, and every one of them fails CLOSED:
 * a refusal, never a silent collection.
 */

/** 🛑 ASSUMED path, relative to the `/pg` base. See the block above, point 1. */
export const EASY_SPLIT_VENDORS_PATH = "/easy-split/vendors";

/** 🛑 ASSUMED body key on `POST /pg/orders`. See the block above, point 2. */
export const ORDER_SPLITS_FIELD = "order_splits";

/**
 * 🛑 **THE OPEN QUESTION, AND IT IS NOT ANSWERABLE FROM THIS TREE.**
 *
 * A multi-vendor cart in this codebase produces ONE payment across SEVERAL
 * orders (`createPhonePeGroupOrder` is called once per seller group off a
 * single capture). Easy Split must therefore carry one split instruction per
 * vendor on ONE order. Whether Cashfree permits that, and up to how many
 * vendors, is a fact about their product that has not been confirmed.
 *
 * This value is set to `0`, which this adapter reads as **UNBOUNDED** — i.e.
 * implement for N, exactly as instructed, rather than inventing a cap and
 * silently refusing carts that would have worked. The alternative shape, if the
 * real limit turns out to be low, is BUYER-VISIBLE: a multi-vendor cart would
 * have to be split into several separate payments, which changes the checkout
 * flow rather than a constant here.
 *
 * 🛑 If a real cap is confirmed, set it here and the adapter REFUSES above it.
 * It must never truncate: dropping the last vendor's split would collect their
 * share into the platform's account and look like a success.
 */
export const MAX_SPLIT_VENDORS_PER_ORDER: number = 0;

/**
 * Cashfree's vendor status → the contract's outcome.
 *
 * 🛑 FAILS CLOSED, and "closed" here means **`pending`, not `rejected`**. An
 * unrecognised status must not become `active` (that would let a split be built
 * against a vendor Cashfree has not approved) and must not become `rejected`
 * either — a refusal is a statement about the seller that sends an operator to
 * contact them, and we would be making it up. `pending` is the only honest
 * answer to "Cashfree said something we do not recognise": the split path
 * refuses to settle to a non-`active` vendor, so nothing is collected wrongly,
 * and the raw value is carried in the message so a human can read it.
 */
export function mapCashfreeVendorStatus(status: string | undefined): SettlementVendorOutcome {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "BLOCKED":
    case "DELETED":
    case "REJECTED":
      return "rejected";
    default:
      // `PENDING`, `IN_BENE_CREATION`, and anything we have not seen.
      return "pending";
  }
}

/**
 * Our vendor shape → Cashfree's.
 *
 * 🛑 See the block at the top of this section, point 1: every key below is
 * ASSUMED. The mapping is written structurally so it can be checked against the
 * docs by eye, and it is one function so correcting it is one edit.
 *
 * 🛑 EXACTLY ONE destination is sent. The input type already says bank and UPI
 * are mutually exclusive; this is where it is enforced, because sending both
 * would let Cashfree choose where real money lands.
 *
 * 🛑 `verify_account: true` asks Cashfree to run its OWN account verification —
 * which is the entire reason `SellerPayoutDetails.verificationStatus` exists
 * and the only verification in this system that is not a self-assertion. We
 * hold no banking licence and have no penny-drop; this is the check.
 *
 * 🛑 `dashboard_access: false`. A vendor login would be a second place a seller
 * can change where their money goes, outside this platform's own audit trail.
 */
/**
 * The wire shape of a Cashfree vendor registration.
 *
 * 🛑 Declared rather than returned as `Record<string, unknown>`, which accepts
 * ANY key and so would have made a typo'd `account_ifsc` compile — and a
 * destination field the gateway silently ignores is a vendor registered
 * against the wrong account. `audit-unknown-leakage` blocks the bag-of-unknown
 * shape for exactly this reason.
 *
 * Still an assumption about Cashfree's API, like everything else in this file;
 * what the type buys is that OUR side is consistent with itself.
 */
interface CashfreeVendorPayload {
  vendor_id: string;
  name: string;
  email: string;
  phone: string;
  /** Asks Cashfree to run its own account verification — see below. */
  verify_account: true;
  dashboard_access: false;
  bank?: { account_number: string; account_ifsc: string };
  upi?: { vpa: string };
  kyc_details?: { pan?: string; gst?: string };
}

export function cashfreeVendorPayload(input: SettlementVendorInput): CashfreeVendorPayload {
  const destination = input.bank
    ? {
        bank: {
          account_number: input.bank.accountNumber,
          account_ifsc: input.bank.ifsc.toUpperCase(),
        },
      }
    : input.upi
      ? { upi: { vpa: input.upi.vpa } }
      : {};

  return {
    vendor_id: input.vendorId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    verify_account: true,
    dashboard_access: false,
    ...destination,
    /*
     * 🛑 `kyc_details` is sent only when there is something to put in it.
     * Cashfree validates the shape of what it receives, so an empty object is
     * a likelier 400 than an omitted key — and a seller with no PAN and no
     * GSTIN is a real state (blocker #5), not an error to force.
     */
    ...(input.pan || input.gstin
      ? {
          kyc_details: {
            ...(input.pan ? { pan: input.pan } : {}),
            ...(input.gstin ? { gst: input.gstin } : {}),
          },
        }
      : {}),
  };
}

/**
 * Split instructions → Cashfree's `order_splits`.
 *
 * 🛑 DECIMAL RUPEES, like `order_amount`. Every caller passes the smallest
 * unit; the conversion happens here, at the boundary, exactly once. A split in
 * the wrong unit is indistinguishable from a correct one until a seller is paid
 * 100× too much.
 *
 * 🛑 Refuses a zero or negative share rather than sending it. A ₹0 split is at
 * best a no-op and at worst a 400 that fails the whole capture; either way the
 * caller computed something it did not mean, and the correct response is to say
 * so rather than to quietly drop a vendor from a settlement.
 */
export function toOrderSplits(
  splits: readonly SplitInstruction[],
): Array<{ vendor_id: string; amount: number }> {
  return splits.map((split) => {
    if (!split.vendorId) {
      throw Object.assign(
        new Error(
          `Cashfree split instruction for store "${split.storeId}" has no vendorId — ` +
            `that store is not registered as an Easy Split vendor, so its share ` +
            `cannot be settled to it.`,
        ),
        { httpStatus: 409, code: "SPLIT_VENDOR_UNREGISTERED" },
      );
    }
    if (!Number.isFinite(split.amount) || split.amount <= 0) {
      throw Object.assign(
        new Error(
          `Cashfree split instruction for vendor "${split.vendorId}" has a ` +
            `non-positive amount (${split.amount}). Refusing rather than dropping ` +
            `the vendor from the settlement.`,
        ),
        { httpStatus: 400, code: "SPLIT_AMOUNT_INVALID" },
      );
    }
    return {
      vendor_id: split.vendorId,
      // 🛑 DECIMAL RUPEES — the one unit conversion on the way out.
      amount: paiseToRupees(split.amount),
    };
  });
}
