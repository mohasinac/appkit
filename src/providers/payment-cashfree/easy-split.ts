/*
 * Cashfree EASY SPLIT — the vendor and per-vendor-share surface.
 *
 * Split out of `index.ts` rather than left in it for two reasons, and the
 * second is the one that matters:
 *
 *   1. that file reached the 1,000-line `max-lines` ceiling;
 *   2. **every fact in here was originally SPECIFIED, NOT CONFIRMED, and now
 *      is — verified end to end against a real sandbox vendor + split
 *      order, not just docs** — see the block below for what 2026-11-05's
 *      live calls found wrong or missing — isolating it here meant
 *      correcting each one was an edit to one named thing in one file, with
 *      no call-site changes.
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
 * 🛑🛑 CONFIRMED 2026-11-05, END TO END — a real sandbox vendor registration
 * followed by a real sandbox split order against it, both succeeded (200),
 * with `order_splits` echoed back correctly on the order entity. This
 * section used to read "every fact below is SPECIFIED, NOT CONFIRMED" —
 * this is what actually retired that, not just reading docs (CLAUDE.md
 * Rule #11): five things were wrong or missing, found by the live calls
 * themselves, not by research:
 *
 *   1. THE VENDOR ENDPOINT AND ITS BODY (`cashfreeVendorPayload` /
 *      `EASY_SPLIT_VENDORS_PATH`). Path confirmed exactly
 *      (`/easy-split/vendors`). The body was NOT exactly right — the raw
 *      example request body in Cashfree's own Create Vendor reference uses
 *      `ifsc` and `account_holder` on both the `bank` and `upi` destination
 *      objects; this file's original guess used `account_ifsc` and omitted
 *      `account_holder` entirely on both. Fixed in `cashfreeVendorPayload`
 *      below — see its own comment.
 *
 *   2. THE SPLIT FIELD ON THE ORDER (`ORDER_SPLITS_FIELD`, `toOrderSplits`).
 *      This was the DANGEROUS one — a wrong field name here is not
 *      necessarily an error; Cashfree could silently ignore an unknown key
 *      and capture the order with no split, collecting another seller's
 *      money into the platform's own account while looking like a success.
 *      CONFIRMED CORRECT as originally written: `order_splits`, each entry
 *      `{vendor_id, amount}` — verbatim from the Create Order OpenAPI schema,
 *      and now also confirmed by a real order actually echoing it back.
 *
 *   3. HOW MANY VENDORS ONE ORDER MAY CARRY (`MAX_SPLIT_VENDORS_PER_ORDER`).
 *      Confirmed via Cashfree's own Easy Split FAQ: "You can split a single
 *      transaction among a maximum of 5 vendors." Set below.
 *
 *   4. `status` ON THE VENDOR PAYLOAD. Found live, not from docs — a real
 *      sandbox Create Vendor call without this field was rejected with
 *      `status_missing`. Added as a required `"ACTIVE"` literal; see
 *      `CashfreeVendorPayload`'s own comment.
 *
 *   5. `kyc_details.business_type` ON THE VENDOR PAYLOAD. Also found live —
 *      an omitted `kyc_details` was rejected with `kyc_details_missing`;
 *      an empty one was then rejected with
 *      `kyc_details.business_type_missing`; a guessed `"Individual"` was
 *      then rejected with `INVALID_REQUEST_TYPE` and Cashfree's own
 *      validator handed back the full accepted enum in its error message.
 *      `"E-commerce"` — confirmed correct, not guessed — is now sent for
 *      every vendor; see `CASHFREE_VENDOR_BUSINESS_TYPE`'s own comment for
 *      the full accepted list.
 */

/** Confirmed against Cashfree's own Create Vendor API reference, 2026-11-05. */
export const EASY_SPLIT_VENDORS_PATH = "/easy-split/vendors";

/** Confirmed against Cashfree's own Create Order OpenAPI schema, 2026-11-05 — each entry `{vendor_id, amount}`. */
export const ORDER_SPLITS_FIELD = "order_splits";

/**
 * Confirmed against Cashfree's own Easy Split FAQ, 2026-11-05: "You can
 * split a single transaction among a maximum of 5 vendors."
 *
 * A multi-vendor cart in this codebase produces ONE payment across SEVERAL
 * orders (`createPhonePeGroupOrder` is called once per seller group off a
 * single capture), so this is the real ceiling the adapter refuses above —
 * see `createOrderWithSplit`'s own check. Never truncates: dropping the
 * last vendor's split would collect their share into the platform's account
 * and look like a success: a cart needing a 6th seller settled gets a loud,
 * buyer-visible refusal instead.
 */
export const MAX_SPLIT_VENDORS_PER_ORDER: number = 5;

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
  /*
   * 🛑 CONFIRMED 2026-11-05 — a REQUIRED field, found live: a sandbox Create
   * Vendor call against the raw payload (before this field existed) was
   * rejected with `{"code":"status_missing","message":"status : is missing
   * in the request."}`. Cashfree's own raw example body for this endpoint
   * sets it to `"ACTIVE"`. This is the vendor record's initial state, not a
   * substitute for `verify_account` — Cashfree's own verification still
   * runs; an unverified vendor stays unable to receive a split regardless
   * of this value, per `mapCashfreeVendorStatus`'s own fail-closed read of
   * the status Cashfree reports back.
   */
  status: "ACTIVE";
  name: string;
  email: string;
  phone: string;
  /** Asks Cashfree to run its own account verification — see below. */
  verify_account: true;
  dashboard_access: false;
  bank?: { account_number: string; account_holder: string; ifsc: string };
  upi?: { vpa: string; account_holder: string };
  /*
   * 🛑 CONFIRMED 2026-11-05 — REQUIRED, found live in two steps. An omitted
   * `kyc_details` was rejected with `kyc_details_missing`; an empty
   * `kyc_details: {}` was then rejected with
   * `kyc_details.business_type_missing`. `business_type` is a merchant-
   * category enum, not a legal structure — Cashfree's own validator
   * rejected a guessed `"Individual"` with the full accepted list in its
   * error message (`CASHFREE_VENDOR_BUSINESS_TYPE`'s own comment has it
   * verbatim), which is how `"E-commerce"` was confirmed correct rather
   * than guessed.
   */
  kyc_details: { business_type: string; pan?: string; gst?: string };
}

/*
 * 🛑 CONFIRMED 2026-11-05 live against Cashfree's sandbox validator — a
 * guessed `business_type: "Individual"` was rejected with
 * `INVALID_REQUEST_TYPE` and this VERBATIM accepted list: Grocery,
 * Jewellery, Miscellaneous, Web host/Domain seller, E-commerce, Online
 * Gaming, Society/Trust/Club/Association, Mutual funds/Broking, B2B, Real
 * Estate, Housing, Rentals, Utilities, Travel and Hospitality, Education,
 * Food and Beverages, NBFCs/Organizations into Lending, Chit Funds, Non
 * Profit/NGO, Financial Services, Government, Readymade, SaaS, Professional
 * Services (Doctors, Lawyers, Architects, CAs, and other Professionals),
 * Open and Semi Open Wallet, Social Media and Entertainment, Pan shop,
 * Telecom, Digital Goods, Insurance, Pharmacy, Healthcare, Retail and
 * Shopping, Gaming, Logistics.
 *
 * Every vendor this platform registers IS a marketplace seller on this
 * platform — there is no per-seller input to collect here, so this is a
 * platform-wide constant, not a guess per vendor. `"E-commerce"` is the one
 * entry that actually describes what every vendor here is.
 */
const CASHFREE_VENDOR_BUSINESS_TYPE = "E-commerce";

export function cashfreeVendorPayload(input: SettlementVendorInput): CashfreeVendorPayload {
  /*
   * 🛑 CONFIRMED 2026-11-05 against Cashfree's own raw example request body
   * (API reference, Create Vendor) — `account_holder` and `ifsc` (NOT
   * `account_ifsc`), on BOTH destination objects. The original guess here
   * used `account_ifsc` and omitted `account_holder` on both bank and UPI —
   * exactly the "wrong key, Cashfree ignores it, vendor registers with an
   * incomplete/wrong destination" risk the file's own header warns about.
   * Fixed to the confirmed shape.
   */
  const destination = input.bank
    ? {
        bank: {
          account_number: input.bank.accountNumber,
          account_holder: input.bank.accountHolderName,
          ifsc: input.bank.ifsc.toUpperCase(),
        },
      }
    : input.upi
      ? { upi: { vpa: input.upi.vpa, account_holder: input.upi.accountHolderName } }
      : {};

  return {
    vendor_id: input.vendorId,
    status: "ACTIVE",
    name: input.name,
    email: input.email,
    phone: input.phone,
    verify_account: true,
    dashboard_access: false,
    ...destination,
    /*
     * 🛑 `kyc_details` is now ALWAYS sent — see the field's own comment on
     * `CashfreeVendorPayload`. `business_type` is the one sub-field
     * Cashfree's validator requires; `pan`/`gst` stay conditional since a
     * seller with neither is a real state (blocker #5), not an error to
     * force — only `business_type` is non-negotiable.
     */
    kyc_details: {
      business_type: CASHFREE_VENDOR_BUSINESS_TYPE,
      ...(input.pan ? { pan: input.pan } : {}),
      ...(input.gstin ? { gst: input.gstin } : {}),
    },
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
