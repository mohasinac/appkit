/**
 * Core: weighted random selection from an event's `spinPrizes` config using
 * `crypto.randomInt`. Enforces `spinMaxPerUser` (per identity — user or
 * guest) and the optional `spinWindowStart`/`spinWindowEnd` window.
 *
 * Find-or-create is intentional: the spin UI never calls `enterEvent()`
 * first (unlike poll/survey/raffle), so this function owns creating the
 * backing `eventEntries` doc the first time an identity spins. The whole
 * find/create/assign/mark-used sequence runs inside a single Firestore
 * transaction so two rapid spins from the same identity can't both win a
 * prize (the old read-then-`ref.update()` version had this race).
 */

import crypto from "node:crypto";
import type { JobContext } from "../runtime/types";
import { EVENT_ENTRY_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";
import { resolveDate } from "../../../../utils";

export interface AssignSpinPrizeInput {
  eventId: string;
  /** Logged-in identity. Exactly one of userId/guestIpHash must be set. */
  userId?: string;
  /** Hashed guest identity (see `hashGuestIdentity` in security/rate-limit.ts) — never a raw IP. */
  guestIpHash?: string;
}

export interface AssignSpinPrizeResult {
  eventId: string;
  userId?: string;
  spinPrizeId?: string;
  spinPrizeTitle?: string;
  spinPrizeCouponCode?: string;
  alreadyUsed?: boolean;
  reason?: string;
}

interface SpinPrize {
  id: string;
  /** Matches the stored field name on `EventDocument.spinPrizes` (the admin
   * editor and its Zod schema both call it `label`, not `title` — an
   * earlier version of this file used `title` here, which never matched
   * any real document and left `AssignSpinPrizeResult.spinPrizeTitle`
   * permanently undefined; the client never noticed because SpinWheelView
   * resolves the won prize's label from its own already-loaded prizes
   * array instead of this field). */
  label: string;
  weight: number;
  couponId?: string;
}

interface EventForSpin {
  spinPrizes?: SpinPrize[];
  spinMaxPerUser?: number;
  // Matches EventDocument's canonical field type (appkit/src/features/events/schemas/firestore.ts).
  // `resolveDate()` also tolerates a raw Firestore Timestamp at runtime (this
  // interface is populated via an unchecked `.data() as EventForSpin` cast).
  spinWindowStart?: Date;
  spinWindowEnd?: Date;
  allowGuestParticipation?: boolean;
}

interface SpinEntryData {
  spinUsed?: boolean;
  spinCount?: number;
  spinPrizeId?: string;
}

const EVENTS_COLLECTION = "events";
const EVENT_ENTRIES_COLLECTION = "eventEntries";
const COUPONS_COLLECTION = "coupons";

export async function runAssignSpinPrize(
  input: AssignSpinPrizeInput,
  ctx: JobContext,
): Promise<AssignSpinPrizeResult> {
  if (ctx.env("FEATURE_PRIZE_DRAWS") !== "true") {
    ctx.logger.info("FEATURE_PRIZE_DRAWS disabled — skipping spin prize assignment");
    return { eventId: input.eventId, userId: input.userId, reason: "feature_disabled" };
  }
  const { eventId, userId, guestIpHash } = input;

  if (!userId && !guestIpHash) {
    return { eventId, userId, reason: "identity_required" };
  }

  const eventSnap = await ctx.db.collection(EVENTS_COLLECTION).doc(eventId).get();
  if (!eventSnap.exists) {
    return { eventId, userId, reason: "event_not_found" };
  }
  const event = eventSnap.data() as EventForSpin;

  if (!userId && !event.allowGuestParticipation) {
    return { eventId, userId, reason: "login_required" };
  }

  const prizes = Array.isArray(event.spinPrizes) ? event.spinPrizes : [];
  const totalWeight = prizes.reduce((s, p) => s + (p.weight ?? 0), 0);
  if (totalWeight <= 0) {
    return { eventId, userId, reason: "no_prizes_configured" };
  }

  const windowStart = resolveDate(event.spinWindowStart);
  const windowEnd = resolveDate(event.spinWindowEnd);
  if ((windowStart && ctx.now < windowStart) || (windowEnd && ctx.now > windowEnd)) {
    return { eventId, userId, reason: "outside_spin_window" };
  }

  const maxPerUser =
    typeof event.spinMaxPerUser === "number" && event.spinMaxPerUser > 0
      ? event.spinMaxPerUser
      : 1;

  const identityField = userId ? EVENT_ENTRY_FIELDS.USER_ID : EVENT_ENTRY_FIELDS.GUEST_IP_HASH;
  const identityValue = (userId ?? guestIpHash) as string;

  return ctx.db.runTransaction(async (tx) => {
    const entriesQuery = ctx.db
      .collection(EVENT_ENTRIES_COLLECTION)
      .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
      .where(identityField, "==", identityValue)
      .limit(1);
    const entriesSnap = await tx.get(entriesQuery);

    const existingDoc = entriesSnap.empty ? null : entriesSnap.docs[0];
    const existingData = existingDoc?.data() as SpinEntryData | undefined;
    const priorSpinCount = existingData?.spinCount ?? (existingData?.spinUsed ? 1 : 0);

    if (priorSpinCount >= maxPerUser) {
      return {
        eventId,
        userId,
        spinPrizeId: existingData?.spinPrizeId,
        alreadyUsed: true,
      };
    }

    const roll = crypto.randomInt(0, totalWeight);
    let cumulative = 0;
    let pick: SpinPrize | undefined;
    for (const p of prizes) {
      cumulative += p.weight ?? 0;
      if (roll < cumulative) {
        pick = p;
        break;
      }
    }
    if (!pick) pick = prizes[prizes.length - 1];

    let spinPrizeCouponCode: string | undefined;
    if (pick.couponId) {
      const coupSnap = await tx.get(ctx.db.collection(COUPONS_COLLECTION).doc(pick.couponId));
      if (coupSnap.exists) {
        spinPrizeCouponCode = (coupSnap.data() as { code?: string }).code;
      }
    }

    const nextSpinCount = priorSpinCount + 1;
    const spinFields = {
      [EVENT_ENTRY_FIELDS.SPIN_USED]: true,
      [EVENT_ENTRY_FIELDS.SPIN_COUNT]: nextSpinCount,
      [EVENT_ENTRY_FIELDS.SPIN_PRIZE_ID]: pick.id,
      [EVENT_ENTRY_FIELDS.SPIN_WON_AT]: ctx.now,
      [EVENT_ENTRY_FIELDS.SPIN_PRIZE_COUPON_CODE]: spinPrizeCouponCode ?? null,
      [COMMON_FIELDS.UPDATED_AT]: ctx.now,
    };

    if (existingDoc) {
      tx.update(existingDoc.ref, spinFields);
    } else {
      const newRef = ctx.db.collection(EVENT_ENTRIES_COLLECTION).doc();
      tx.set(newRef, {
        [EVENT_ENTRY_FIELDS.EVENT_ID]: eventId,
        ...(userId
          ? { [EVENT_ENTRY_FIELDS.USER_ID]: userId }
          : { [EVENT_ENTRY_FIELDS.GUEST_IP_HASH]: guestIpHash }),
        reviewStatus: "approved",
        submittedAt: ctx.now,
        ...spinFields,
      });
    }

    ctx.logger.info("Spin prize assigned", {
      eventId,
      userId: userId ?? "guest",
      spinPrizeId: pick.id,
    });

    return {
      eventId,
      userId,
      spinPrizeId: pick.id,
      spinPrizeTitle: pick.label,
      spinPrizeCouponCode,
    };
  });
}
