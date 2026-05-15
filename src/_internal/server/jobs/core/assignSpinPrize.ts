/**
 * Core: weighted random selection from an event's `spinPrizes` config using
 * `crypto.randomInt`. Enforces one spin per user.
 */

import crypto from "node:crypto";
import type { JobContext } from "../runtime/types";
import { EVENT_ENTRY_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";

export interface AssignSpinPrizeInput {
  eventId: string;
  userId: string;
}

export interface AssignSpinPrizeResult {
  eventId: string;
  userId: string;
  spinPrizeId?: string;
  spinPrizeTitle?: string;
  spinPrizeCouponCode?: string;
  alreadyUsed?: boolean;
  reason?: string;
}

interface SpinPrize {
  id: string;
  title: string;
  weight: number;
  couponId?: string;
}

const EVENTS_COLLECTION = "events";
const EVENT_ENTRIES_COLLECTION = "eventEntries";
const COUPONS_COLLECTION = "coupons";

export async function runAssignSpinPrize(
  input: AssignSpinPrizeInput,
  ctx: JobContext,
): Promise<AssignSpinPrizeResult> {
  const { eventId, userId } = input;

  const eventSnap = await ctx.db.collection(EVENTS_COLLECTION).doc(eventId).get();
  if (!eventSnap.exists) {
    return { eventId, userId, reason: "event_not_found" };
  }
  const event = eventSnap.data() as { spinPrizes?: SpinPrize[] };
  const prizes = Array.isArray(event.spinPrizes) ? event.spinPrizes : [];
  const totalWeight = prizes.reduce((s, p) => s + (p.weight ?? 0), 0);
  if (totalWeight <= 0) {
    return { eventId, userId, reason: "no_prizes_configured" };
  }

  const entriesSnap = await ctx.db
    .collection(EVENT_ENTRIES_COLLECTION)
    .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
    .where(EVENT_ENTRY_FIELDS.USER_ID, "==", userId)
    .limit(1)
    .get();

  if (entriesSnap.empty) {
    return { eventId, userId, reason: "entry_not_found" };
  }
  const entryDoc = entriesSnap.docs[0];
  const entry = entryDoc.data() as { spinUsed?: boolean; spinPrizeId?: string };
  if (entry.spinUsed) {
    return {
      eventId,
      userId,
      spinPrizeId: entry.spinPrizeId,
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
    const coupSnap = await ctx.db
      .collection(COUPONS_COLLECTION)
      .doc(pick.couponId)
      .get();
    if (coupSnap.exists) {
      spinPrizeCouponCode = (coupSnap.data() as { code?: string }).code;
    }
  }

  await entryDoc.ref.update({
    [EVENT_ENTRY_FIELDS.SPIN_USED]: true,
    [EVENT_ENTRY_FIELDS.SPIN_PRIZE_ID]: pick.id,
    [EVENT_ENTRY_FIELDS.SPIN_WON_AT]: ctx.now,
    [EVENT_ENTRY_FIELDS.SPIN_PRIZE_COUPON_CODE]: spinPrizeCouponCode ?? null,
    [COMMON_FIELDS.UPDATED_AT]: ctx.now,
  });

  ctx.logger.info("Spin prize assigned", {
    eventId,
    userId,
    spinPrizeId: pick.id,
  });

  return {
    eventId,
    userId,
    spinPrizeId: pick.id,
    spinPrizeTitle: pick.title,
    spinPrizeCouponCode,
  };
}
