/**
 * `vendors` + `expenses` — money that leaves the business for something
 * other than a payout or a refund.
 *
 * ## 🛑 A VENDOR IS AN IDENTITY, which `supplierName` never was
 *
 * `ShipmentDocument.supplierName` is free text, so four shipments from one
 * supplier are four unjoined strings and "what have we spent with Acme" is
 * unanswerable. That is not a reporting nicety: it is also the join that
 * makes input GST claimable per supplier, which is what a GSTR-2B
 * reconciliation needs.
 *
 * ## 🛑 An expense is TRUTH; its journal entry is the projection
 *
 * Same split as orders and payouts. The expense row is what somebody
 * actually paid for, with the bill attached; the ledger says how it was
 * classified. Re-classifying an expense posts a reversal and a new entry —
 * it never edits the old one — so the two stay reconcilable.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const VENDORS_COLLECTION = "vendors";
export const EXPENSES_COLLECTION = "expenses";

export interface VendorDocument extends BaseDocument {
  /** `vendor-{slug}` — a pure slug, like every other named entity here. */
  name: string;
  /**
   * 🛑 The GSTIN is what makes input tax claimable, and it is NOT PII.
   *
   * It is a business registration number, printed on every invoice the
   * vendor issues and published in the GST portal's public search. Treating
   * it as PII would mean encrypting the one field a GSTR-2B reconciliation
   * has to match on — which would make the reconciliation impossible for no
   * privacy gain.
   */
  gstin?: string;
  /**
   * Where the vendor is registered, for the place-of-supply rule.
   *
   * An intra-state purchase splits input tax into CGST + SGST and an
   * inter-state one is IGST; they are different ledger accounts and a wrong
   * one is a wrong return. Optional because a vendor with no GSTIN charges
   * no GST and the question does not arise.
   */
  stateCode?: string;
  notes?: string;
  isActive: boolean;
}

/**
 * What the money was for. Drives the expense account the posting hits.
 *
 * 🛑 A closed union rather than free text, and `other` is a real member
 * precisely so the exception stays countable — "how much of our spend is
 * unclassified" is one query, and a growing answer is the signal to add a
 * category rather than a reason to allow typing one.
 */
export type ExpenseCategory =
  | "freight"
  | "platform-software"
  | "wages"
  | "packaging"
  | "asset"
  | "other";

export interface ExpenseDocument extends BaseDocument {
  vendorId?: string;
  /** As written on the bill, for the same reason `supplierName` survives. */
  vendorName: string;
  category: ExpenseCategory;
  /** The date on the BILL, not when it was entered — the period follows this. */
  billDate: Date;
  billNumber?: string;
  /** Excluding tax. */
  amount: number;
  /**
   * Input GST on this bill, claimable as ITC.
   *
   * 🛑 Stored SEPARATELY from `amount` rather than as a rate, because the
   * figure on the bill is authoritative and re-deriving it from a
   * percentage reproduces the supplier's rounding wrongly about as often as
   * it reproduces it rightly — and the difference is what a GSTR-2B
   * mismatch is made of.
   */
  inputGst?: number;
  /** Set once posted, so a re-run cannot double-post. */
  journalEntryId?: string;
  attachmentUrl?: string;
  recordedByUid: string;
}

export const EXPENSE_FIELDS = {
  VENDOR_ID: "vendorId",
  CATEGORY: "category",
  BILL_DATE: "billDate",
  JOURNAL_ENTRY_ID: "journalEntryId",
} as const;
