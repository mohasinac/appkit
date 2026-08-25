/**
 * Offer document → API shape.
 *
 * Offers had **no adapter at all** before this: all three routes
 * (`/api/user/offers`, `/api/store/offers`, `/api/admin/offers`) returned raw
 * `OfferDocument`s straight from the repository, carrying live `Date`
 * objects. `UserOffersPanel.relativeTime` still has a defensive
 * `date instanceof Date ? … : new Date(…)` branch precisely because the shape
 * it receives depends on whether the value survived JSON serialisation.
 *
 * Mirrors `orders/adapters.ts`, including its `toIsoOrUndefined` helper.
 */

import type { OfferDocument } from "../../../../features/seller/schemas";
import type { FieldChange } from "../../../shared/history/index";

function toIsoOrUndefined(value: Date | undefined): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

function toIso(value: Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** One entry on an offer's timeline — dates as ISO, ready for JSON. */
export interface OfferTimelineEntry {
  at: string;
  actorUid?: string;
  actorRole: "buyer" | "seller" | "admin" | "system";
  changes: Record<string, FieldChange>;
  reason?: string;
  note?: string;
  trigger: string;
}

/** One round of a negotiation, as rendered in the chain rail. */
export interface OfferChainRound {
  id: string;
  counterRound: number;
  status: OfferDocument["status"];
  offerAmount: number;
  counterAmount?: number;
  /**
   * `withdrawn` + a `supersededByOfferId` is NOT a walk-away — the buyer
   * countered. The timeline renders it neutral ("Superseded") rather than
   * negative ("Withdrawn"), which is why this flag is carried explicitly
   * instead of being re-derived in the component.
   */
  superseded: boolean;
  createdAt: string;
  respondedAt?: string;
  sellerNote?: string;
  buyerNote?: string;
}

export interface Offer {
  id: string;
  productId: string;
  productTitle: string;
  productSlug?: string;
  productImageUrl?: string;
  storeId: string;
  storeName: string;
  offerAmount: number;
  listedPrice: number;
  counterAmount?: number;
  lockedPrice?: number;
  currency: string;
  status: OfferDocument["status"];
  buyerNote?: string;
  sellerNote?: string;
  expiresAt: string;
  acceptedAt?: string;
  checkoutDeadline?: string;
  respondedAt?: string;
  paidOrderId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;

  // Negotiation history + chain
  timeline?: OfferTimelineEntry[];
  timelineTruncated?: number;
  previousOfferId?: string;
  supersededByOfferId?: string;
  chainRootOfferId?: string;
  counterRound?: number;
  /** True when this round was superseded by the buyer's own counter. */
  superseded: boolean;

  // Admin escalation
  cancelledByAdminUid?: string;
  cancelReason?: string;

  // Buyer identity — ONLY when explicitly requested. See below.
  buyerUid?: string;
  buyerName?: string;
  buyerEmail?: string;
}

export interface OfferAdapterOptions {
  /**
   * Include `buyerUid`/`buyerName`/`buyerEmail`.
   *
   * Default **false**, deliberately. The seller-facing route masks buyer
   * identity, and a route that forgot to call `maskOfferForSeller` would
   * previously have shipped it verbatim — there was no adapter to stop it.
   * Making the omission the default means forgetting the flag under-shares
   * rather than leaks.
   */
  includeBuyerIdentity?: boolean;
}

export function offerDocumentToOffer(
  doc: OfferDocument,
  opts: OfferAdapterOptions = {},
): Offer {
  const superseded = doc.status === "withdrawn" && Boolean(doc.supersededByOfferId);

  return {
    id: doc.id,
    productId: doc.productId,
    productTitle: doc.productTitle,
    productSlug: doc.productSlug,
    productImageUrl: doc.productImageUrl,
    storeId: doc.storeId,
    storeName: doc.storeName,
    offerAmount: doc.offerAmount,
    listedPrice: doc.listedPrice,
    counterAmount: doc.counterAmount,
    lockedPrice: doc.lockedPrice,
    currency: doc.currency,
    status: doc.status,
    buyerNote: doc.buyerNote,
    sellerNote: doc.sellerNote,
    expiresAt: toIso(doc.expiresAt),
    acceptedAt: toIsoOrUndefined(doc.acceptedAt),
    checkoutDeadline: toIsoOrUndefined(doc.checkoutDeadline),
    respondedAt: toIsoOrUndefined(doc.respondedAt),
    paidOrderId: doc.paidOrderId,
    paidAt: toIsoOrUndefined(doc.paidAt),
    createdAt: toIso(doc.createdAt as Date),
    updatedAt: toIso(doc.updatedAt as Date),

    timeline: doc.statusHistory?.map((entry) => ({
      at: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
      actorUid: entry.actorUid,
      actorRole: entry.actorRole,
      changes: entry.changes,
      reason: entry.reason,
      note: entry.note,
      trigger: entry.trigger,
    })),
    timelineTruncated: doc.statusHistoryTruncated,
    previousOfferId: doc.previousOfferId,
    supersededByOfferId: doc.supersededByOfferId,
    chainRootOfferId: doc.chainRootOfferId,
    counterRound: doc.counterRound,
    superseded,

    cancelledByAdminUid: doc.cancelledByAdminUid,
    cancelReason: doc.cancelReason,

    ...(opts.includeBuyerIdentity
      ? { buyerUid: doc.buyerUid, buyerName: doc.buyerName, buyerEmail: doc.buyerEmail }
      : {}),
  };
}

/**
 * A chain round — the compact shape the timeline needs, without re-sending
 * the whole document for every round.
 *
 * Buyer identity is never included: the chain is rendered on all three
 * portals from one component, and the seller's view must not gain identity
 * it is masked from elsewhere.
 */
export function offerToChainRound(doc: OfferDocument): OfferChainRound {
  return {
    id: doc.id,
    counterRound: doc.counterRound ?? 1,
    status: doc.status,
    offerAmount: doc.offerAmount,
    counterAmount: doc.counterAmount,
    superseded: doc.status === "withdrawn" && Boolean(doc.supersededByOfferId),
    createdAt: toIso(doc.createdAt as Date),
    respondedAt: toIsoOrUndefined(doc.respondedAt),
    sellerNote: doc.sellerNote,
    buyerNote: doc.buyerNote,
  };
}
