/**
 * `protectionClaims` — a buyer's claim against protection cover they paid for.
 *
 * ## Why this collection is the point of Phase 6
 *
 * We charge **2% (min ₹30)** shipment protection and **3% (min ₹49)** sale
 * protection. Both platform flags are seeded `true` and sellers can self-enable
 * in payout settings, so the fee is collectable today. And every piece needed to
 * honour it existed with **zero callers**: `protectionAvailability()`,
 * `adjudicateClaim()`, `returnDestination()`, `RETURN_CUSTODY_STATES`,
 * `SALE_PROTECTION_MAX_VALUE`, `PROTECTION_CLAIM_WINDOW_HOURS`, and the
 * `returnCustody` / `returnPostedAt` / `returnReceivedAt` / `returnInspection`
 * fields on the order (D11).
 *
 * So the money moved and the promise did not. A FAQ said *"we pursue the
 * courier and refund you"* and *"refunded no questions asked"* with nothing
 * behind either sentence. This collection is what gives those pieces their
 * first writer.
 *
 * ## 🛑 The claim WINDOW is not stored here
 *
 * It is the `claim-shipping` / `claim-sale` obligations (Phase 5b), derived from
 * `deliveryDate` through `PROTECTION_CLAIM_WINDOW_HOURS` — 48h for shipping,
 * 168h for sale. Storing a deadline on the claim would be a second copy that
 * drifts from the policy (Root Cause #42), and the obligation already closes
 * the window and earns the premium.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import type {
  ClaimFinding,
  ProtectionKind,
} from "../../../_internal/shared/features/shipping/protections";

export const PROTECTION_CLAIMS_COLLECTION = "protectionClaims";

/**
 * Lifecycle.
 *
 * | state | meaning |
 * |---|---|
 * | `open` | the buyer filed it; nobody has looked |
 * | `awaiting-return` | the buyer must post the item back (sale cover only) |
 * | `inspecting` | it arrived and is being opened |
 * | `upheld` | `adjudicateClaim` said refund the buyer |
 * | `rejected` | the buyer is not refunded — only reachable on UNPROTECTED cover |
 * | `withdrawn` | the buyer withdrew it |
 * | `expired` | the claim window closed with no action |
 */
export type ProtectionClaimStatus =
  | "open"
  | "awaiting-return"
  | "inspecting"
  | "upheld"
  | "rejected"
  | "withdrawn"
  | "expired";

/**
 * Why the buyer says the cover applies.
 *
 * 🛑 Deliberately NOT the same vocabulary as `ClaimFinding`. The buyer's
 * REASON is what they assert; the `finding` is what a human concluded on
 * opening the parcel, and conflating them would let a buyer's own words decide
 * who pays. `adjudicateClaim(protectedSale, finding)` takes the finding.
 */
export type ProtectionClaimReason =
  | "not-delivered"
  | "damaged-in-transit"
  | "not-as-described"
  | "counterfeit"
  | "missing-parts"
  | "other";

export interface ProtectionClaimDocument extends BaseDocument {
  /** Which cover is being claimed against. */
  kind: ProtectionKind;
  orderId: string;
  /** Denormalised so the admin queue needs no join to show who and where. */
  storeId: string;
  buyerId: string;
  /** Absent means the whole order — the same convention refunds use. */
  itemIds?: string[];

  status: ProtectionClaimStatus;
  reason: ProtectionClaimReason;
  /** The buyer's own account, in their words. */
  detail: string;
  /** Photos. Media slugs, never raw Storage URLs. */
  evidenceUrls?: string[];

  /**
   * Decimal rupees. What the buyer paid for the claimed items, which is the
   * ceiling on the refund.
   *
   * 🛑 Snapshotted at filing, not re-derived at adjudication. A seller cannot
   * reprice an item after a claim is filed, and `SALE_PROTECTION_MAX_VALUE`
   * (₹25,000) is tested against the amount actually paid.
   */
  claimedAmount: number;

  /**
   * The human finding, which is what decides WHO PAYS — never whether a
   * protected buyer is refunded.
   *
   * 🛑 `returnInspection.finding` on the order says the same thing, and that is
   * intentional rather than duplication: the order's copy is the custody
   * record for the parcel, this one is the claim's own audit trail, and a claim
   * can be adjudicated without a return at all (a never-delivered parcel has
   * nothing to inspect).
   */
  finding?: ClaimFinding;
  /** The outcome `adjudicateClaim` produced, recorded verbatim. */
  outcome?: {
    refundBuyer: boolean;
    costBorneBy: "seller" | "platform" | "buyer";
    raisesReport: boolean;
  };
  adjudicatedBy?: string;
  adjudicatedAt?: Date;

  /** The refund this claim produced, so the two are joinable. */
  refundId?: string;

  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
  isTestData?: boolean;
}

export const PROTECTION_CLAIM_FIELDS = {
  ID: "id",
  KIND: "kind",
  ORDER_ID: "orderId",
  STORE_ID: "storeId",
  BUYER_ID: "buyerId",
  STATUS: "status",
  REASON: "reason",
  CLAIMED_AMOUNT: "claimedAmount",
  FINDING: "finding",
  ADJUDICATED_AT: "adjudicatedAt",
  REFUND_ID: "refundId",
  CREATED_AT: "createdAt",
} as const;

/** Statuses where the claim is still somebody's work. */
export const PROTECTION_CLAIM_ACTIVE_STATUSES: readonly ProtectionClaimStatus[] = [
  "open",
  "awaiting-return",
  "inspecting",
];

export const PROTECTION_CLAIM_DETAIL_MIN = 20;
export const PROTECTION_CLAIM_DETAIL_MAX = 2000;

/**
 * 🛑 ONE OPEN CLAIM PER (ORDER, KIND), and the id enforces it.
 *
 * Deterministic, so `.create()` refuses a second claim on the same cover for
 * the same order. Without that a buyer could file five sale-protection claims
 * on one order and — because a protected claim is refunded unconditionally —
 * each one would be a separate refund against the same goods.
 *
 * Keyed on (order, kind) rather than on (order, kind, item) deliberately: a
 * claim names its `itemIds`, so a buyer with a genuine second problem amends
 * the open claim rather than opening a parallel one. Two concurrent claims on
 * one order is an operational mess with no upside.
 */
export function createProtectionClaimId(orderId: string, kind: ProtectionKind): string {
  return `${orderId}__${kind}`.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 1500);
}

const PROTECTION_CLAIM_STATUS_MAP: Record<ProtectionClaimStatus, true> = {
  open: true,
  "awaiting-return": true,
  inspecting: true,
  upheld: true,
  rejected: true,
  withdrawn: true,
  expired: true,
};
export const ALL_PROTECTION_CLAIM_STATUSES = Object.keys(
  PROTECTION_CLAIM_STATUS_MAP,
) as ProtectionClaimStatus[];

const PROTECTION_CLAIM_REASON_MAP: Record<ProtectionClaimReason, true> = {
  "not-delivered": true,
  "damaged-in-transit": true,
  "not-as-described": true,
  counterfeit: true,
  "missing-parts": true,
  other: true,
};
export const ALL_PROTECTION_CLAIM_REASONS = Object.keys(
  PROTECTION_CLAIM_REASON_MAP,
) as ProtectionClaimReason[];

/**
 * Which cover a reason can be claimed under.
 *
 * 🛑 `not-delivered` and `damaged-in-transit` are TRANSIT failures — shipment
 * cover. Everything else is about the item itself — sale cover. Letting a buyer
 * pick the cover themselves would let them claim a non-delivery against the
 * 7-day sale window after the 48-hour transit window had closed, which is the
 * window rule defeated by a dropdown.
 */
/**
 * Buyer-facing labels for the six claim reasons.
 *
 * Lives beside the enum rather than in the claim form, matching
 * `RETURN_REASON_LABEL` and for the same stated reason: these strings appear in
 * the buyer's form, the admin queue and the notification body, and three copies
 * of them would drift. It is also the half of `PROTECTION_COPY` the plan
 * records as missing — `protections.ts` owns the RULES and says its own
 * `ProtectionUnavailableReason` "is rendered to the buyer, so it is copy",
 * while every buyer string sat inline in `StoreAddonsPicker`.
 *
 * `Record<ProtectionClaimReason, string>`, so a seventh reason is a COMPILE
 * error here rather than a radio option rendering `undefined`.
 *
 * 🛑 Phrased as what HAPPENED, never as what the buyer wants. The reason
 * decides the cover kind through `REASON_TO_KIND`, so it is a statement of
 * fact that a window is measured against — not a request. "It never arrived"
 * is a transit failure; "I changed my mind" is not a claim at all and is
 * deliberately absent from the union.
 */
export const PROTECTION_CLAIM_REASON_LABEL: Record<ProtectionClaimReason, string> = {
  "not-delivered": "It never arrived",
  "damaged-in-transit": "It arrived damaged",
  "not-as-described": "It is not what the listing described",
  counterfeit: "It is counterfeit or not authentic",
  "missing-parts": "Parts are missing",
  other: "Something else is wrong with the item",
};

export const REASON_TO_KIND: Record<ProtectionClaimReason, ProtectionKind> = {
  "not-delivered": "shipping",
  "damaged-in-transit": "shipping",
  "not-as-described": "sale",
  counterfeit: "sale",
  "missing-parts": "sale",
  other: "sale",
};
