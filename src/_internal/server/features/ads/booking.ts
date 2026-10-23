/**
 * D56 — self-serve ad bookings: take a slot, moderate the creative, bill it.
 *
 * ## 🛑 Availability is a DOCUMENT COLLISION, not a query
 *
 * The obvious implementation of "two advertisers must not book overlapping
 * dates" is to query for an overlap and write when none is found. That is a
 * read-then-write race: two concurrent bookings both read "free" and both
 * write, and the slot is sold twice with nothing erroring. It is invisible
 * in any test that does not run two requests at the same instant.
 *
 * So the booking id is `${placementId}__${period}` and creation uses
 * `tx.create`, which throws `ALREADY_EXISTS` on a document that is already
 * there. Firestore does the locking; there is no window between the check
 * and the write because they are the same operation.
 *
 * ## 🛑 Nothing renders until a human approves the creative
 *
 * `isAdBookingLive` requires `approved` AND `paid` AND in-period AND
 * not-cancelled, and the advertiser's write schema cannot express the first
 * two. A self-serve surface where the submitter sets their own moderation
 * state is a form with an extra field, not a moderated system.
 */

import { getAdminDb } from "../../../../providers/db-firebase";
import { ValidationError } from "../../../../errors/validation-error";
import { NotFoundError } from "../../../../errors/not-found-error";
import { ConflictError } from "../../../../errors/conflict-error";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../utils/server-logger";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import {
  AD_BOOKING_COLLECTION,
  adBookingId,
  adPeriodOf,
  adPeriodStart,
  isAdBookingLive,
  isAdPeriod,
  type AdBookingCreative,
  type AdBookingDocument,
  type AdPeriod,
} from "../../../../features/ads/schemas/firestore";

export interface BookAdSlotInput {
  placementId: string;
  period: AdPeriod;
  advertiserUid: string;
  advertiserName?: string;
  creative: AdBookingCreative;
  /**
   * Admin override — book on an advertiser's behalf. The plan requires it:
   * *"a self-serve flow with no manual escape hatch has no way to fix a
   * mistake."* It changes who may call, never what is written.
   */
  byAdmin?: boolean;
}

/**
 * Take a slot. Returns the booking id.
 *
 * Throws **409** when the slot is taken (a well-formed request against a
 * world that moved — the same distinction the lottery config write makes for
 * a pulled slot) and **400** for a past period or an unknown placement.
 */
export async function bookAdSlot(input: BookAdSlotInput): Promise<string> {
  if (!isAdPeriod(input.period)) {
    throw new ValidationError("Pick a month, as YYYY-MM.");
  }

  /*
   * 🛑 The CURRENT period is bookable, a past one is not.
   *
   * Comparing period STARTS rather than "is the period over" is deliberate:
   * booking the running month is a legitimate late sale, and the slot simply
   * runs for whatever is left of it. Refusing it would mean the only
   * bookable month is next month, which is not a rule anybody asked for.
   */
  if (adPeriodStart(input.period) < adPeriodStart(adPeriodOf(new Date()))) {
    throw new ValidationError("That month has already passed.");
  }

  const settings = await siteSettingsRepository.getSingleton();
  const placement = settings?.adSettings?.placements?.find(
    (p) => p.id === input.placementId,
  );
  if (!placement) throw new NotFoundError("No such ad placement.");
  /*
   * A disabled placement renders nothing, so selling it would take money for
   * a slot that cannot appear. An admin override does NOT bypass this —
   * the escape hatch exists to fix a booking, not to sell a dead slot.
   */
  if (!placement.enabled) {
    throw new ValidationError("That placement is not currently sold.");
  }

  const priceRs = resolveSlotPrice(placement);

  const db = getAdminDb();
  const id = adBookingId(input.placementId, input.period);
  const ref = db.collection(AD_BOOKING_COLLECTION).doc(id);
  const now = new Date();

  const doc: Omit<AdBookingDocument, "id"> = {
    placementId: input.placementId,
    period: input.period,
    advertiserUid: input.advertiserUid,
    ...(input.advertiserName ? { advertiserName: input.advertiserName } : {}),
    priceRs,
    paymentState: "unpaid",
    creative: input.creative,
    /*
     * 🛑 Always `pending`, including on the admin path. An admin booking on
     * an advertiser's behalf is still an unreviewed creative — letting the
     * override imply approval would make the escape hatch the way around
     * moderation, which is how every escape hatch eventually gets used.
     */
    moderation: { state: "pending" },
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.runTransaction(async (tx) => {
      /*
       * `tx.create`, NOT `tx.set`. `set` overwrites, which would silently
       * replace another advertiser's paid booking with this one — the exact
       * failure the lock exists to prevent, spelled one method name apart.
       */
      tx.create(ref, doc);
    });
  } catch (error) {
    const normalized = normalizeError(error);
    if (/already exists/i.test(normalized.message)) {
      throw new ConflictError("That slot is already booked for this month.");
    }
    throw error;
  }

  return id;
}

/**
 * A moderator's verdict. **This is the only writer of `moderation.state`.**
 */
export async function moderateAdCreative(
  bookingId: string,
  input: { approve: boolean; note?: string; reviewerUid: string },
): Promise<void> {
  const note = input.note?.trim();
  if (!input.approve && (note?.length ?? 0) < 10) {
    /*
     * Enforced here AND in the Zod schema. The schema protects the route;
     * this protects every other caller, and a rejection with no reason
     * guarantees the advertiser resubmits the same creative (Root Cause
     * #74's shape — a prediction with no mechanism is unenforced).
     */
    throw new ValidationError("Say why it was rejected.");
  }

  const db = getAdminDb();
  const ref = db.collection(AD_BOOKING_COLLECTION).doc(bookingId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new NotFoundError("Booking not found.");

    const booking = snap.data() as AdBookingDocument;
    if (booking.cancelledAt) {
      throw new ConflictError("That booking was cancelled.");
    }

    tx.update(ref, {
      "moderation.state": input.approve ? "approved" : "rejected",
      "moderation.reviewedAt": new Date(),
      "moderation.reviewedBy": input.reviewerUid,
      ...(note ? { "moderation.note": note } : {}),
      updatedAt: new Date(),
    });
  });
}

/**
 * Re-submit a rejected creative.
 *
 * 🛑 Resets moderation to `pending` in the SAME write. A creative edited
 * while `approved` would otherwise go live unreviewed — change the image,
 * keep the approval. That is the whole attack, and it needs no cleverness:
 * submit something bland, get approved, edit.
 */
export async function resubmitAdCreative(
  bookingId: string,
  advertiserUid: string,
  creative: AdBookingCreative,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(AD_BOOKING_COLLECTION).doc(bookingId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new NotFoundError("Booking not found.");

    const booking = snap.data() as AdBookingDocument;
    if (booking.advertiserUid !== advertiserUid) {
      throw new NotFoundError("Booking not found.");
    }
    if (booking.cancelledAt) throw new ConflictError("That booking was cancelled.");

    tx.update(ref, {
      creative,
      "moderation.state": "pending",
      "moderation.note": "",
      updatedAt: new Date(),
    });
  });
}

/**
 * Cancel a booking. **The slot stays locked for its period** — see
 * `AD_BOOKING_CANCELLED_KEEPS_SLOT`. Releasing it is a separate, deliberate
 * admin act.
 */
export async function cancelAdBooking(
  bookingId: string,
  opts: { actorUid: string; reason?: string; byAdmin?: boolean },
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(AD_BOOKING_COLLECTION).doc(bookingId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new NotFoundError("Booking not found.");

    const booking = snap.data() as AdBookingDocument;
    if (!opts.byAdmin && booking.advertiserUid !== opts.actorUid) {
      throw new NotFoundError("Booking not found.");
    }
    if (booking.cancelledAt) return; // idempotent

    tx.update(ref, {
      cancelledAt: new Date(),
      ...(opts.reason ? { cancelledReason: opts.reason } : {}),
      updatedAt: new Date(),
    });
  });
}

/**
 * 🛑 ADMIN ONLY, and it DELETES — this is the one path that frees a period.
 *
 * Cancelling keeps the lock because the advertiser paid for a month that may
 * already be running. Releasing says "that month is for sale again", which
 * is a commercial decision with a refund behind it, so it is separate,
 * explicit, and logged rather than a side effect of a cancel button.
 */
export async function releaseAdSlot(
  placementId: string,
  period: AdPeriod,
  actorUid: string,
): Promise<void> {
  const db = getAdminDb();
  const id = adBookingId(placementId, period);
  const ref = db.collection(AD_BOOKING_COLLECTION).doc(id);

  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("No booking on that slot.");

  const booking = snap.data() as AdBookingDocument;
  if (booking.paymentState === "paid") {
    throw new ConflictError(
      "That booking is paid — refund it before releasing the slot.",
    );
  }

  await ref.delete();
  serverLogger.info("Ad slot released", { placementId, period, actorUid });
}

/**
 * What should actually render in a placement right now.
 *
 * 🛑 ONE document read, by derived id — no query, no index, no scan. The
 * slot's occupant for this month is computable from the placement and the
 * date, which is the second reason the period model is worth its
 * coarseness: the render path of an ad costs the same as reading one row.
 */
export async function liveBookingForPlacement(
  placementId: string,
  now: Date = new Date(),
): Promise<AdBookingDocument | null> {
  const db = getAdminDb();
  const id = adBookingId(placementId, adPeriodOf(now));
  const snap = await db.collection(AD_BOOKING_COLLECTION).doc(id).get();
  if (!snap.exists) return null;

  const booking = { id: snap.id, ...snap.data() } as AdBookingDocument;
  return isAdBookingLive(booking, now) ? booking : null;
}

/** The moderation queue. */
export async function pendingAdBookings(limit = 50): Promise<AdBookingDocument[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(AD_BOOKING_COLLECTION)
    .where("moderation.state", "==", "pending")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdBookingDocument);
}

/** An advertiser's own bookings. */
export async function adBookingsForAdvertiser(
  advertiserUid: string,
  limit = 50,
): Promise<AdBookingDocument[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(AD_BOOKING_COLLECTION)
    .where("advertiserUid", "==", advertiserUid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdBookingDocument);
}

/**
 * The slot's monthly rate, from the placement itself.
 *
 * 🛑 Throws rather than defaulting to zero. A free booking that looks
 * successful is worse than a refused one: the slot is taken, the invoice
 * is ₹0, and nothing anywhere says a price was missing. An unpriced
 * placement is one an admin has not put up for sale yet, and saying so is
 * the honest answer.
 */
function resolveSlotPrice(placement: { priceRsPerPeriod?: number }): number {
  const rate = placement.priceRsPerPeriod;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new ValidationError(
      "That placement has no price set — an admin must add one before it can be sold.",
    );
  }
  return rate;
}

export interface AdSlotOffer {
  placementId: string;
  label: string;
  priceRsPerPeriod: number;
  /** `YYYY-MM` → is it still free? */
  availability: { period: AdPeriod; available: boolean }[];
}

/**
 * The rate card plus availability — what an `/advertise` page renders.
 *
 * 🛑 One read per OFFERED SLOT, and the slot count is bounded by
 * `placements × months`, both small and both known. The id is derived, so
 * this is a `getAll` of specific documents rather than a query — there is no
 * scan, no index, and no page of results to cap.
 *
 * Unpriced and disabled placements are OMITTED rather than shown greyed out:
 * a card for something that cannot be bought is a dead facet, and
 * `brand-rows.ts` already records why that is worse than absent — "it
 * renders as a card in the grid that opens an empty page".
 */
export async function adSlotOffers(months = 6, now: Date = new Date()): Promise<AdSlotOffer[]> {
  const settings = await siteSettingsRepository.getSingleton();
  const placements = (settings?.adSettings?.placements ?? []).filter(
    (p) => p.enabled && typeof p.priceRsPerPeriod === "number" && p.priceRsPerPeriod > 0,
  );
  if (placements.length === 0) return [];

  const periods: AdPeriod[] = [];
  for (let i = 0; i < Math.max(1, Math.min(months, 12)); i += 1) {
    periods.push(
      adPeriodOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))),
    );
  }

  const db = getAdminDb();
  const refs = placements.flatMap((p) =>
    periods.map((period) => db.collection(AD_BOOKING_COLLECTION).doc(adBookingId(p.id, period))),
  );
  const snaps = await db.getAll(...refs);
  const taken = new Set(snaps.filter((s) => s.exists).map((s) => s.id));

  return placements.map((p) => ({
    placementId: p.id,
    label: p.label,
    priceRsPerPeriod: p.priceRsPerPeriod as number,
    availability: periods.map((period) => ({
      period,
      /*
       * A CANCELLED booking still occupies its month — the document is the
       * lock and cancelling deliberately keeps it (see
       * `AD_BOOKING_CANCELLED_KEEPS_SLOT`). Existence is therefore the right
       * test, and reading the status to "free up" a cancelled month here
       * would quietly undo that decision in the one place a buyer sees it.
       */
      available: !taken.has(adBookingId(p.id, period)),
    })),
  }));
}
