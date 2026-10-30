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
 *
 * ## Every non-success branch returns a `reason`, and that is load-bearing
 *
 * Both entry points — `POST /api/events/[id]/spin` and the Firebase callable —
 * decide success by `if (data.reason && !data.spinPrizeId)`. A branch that
 * returns early WITHOUT a reason is therefore reported to the caller as a
 * successful spin that awarded nothing. Reasons come from
 * `EVENT_DRAW_REASON`; `reasonToHttp` turns each into one status and one
 * stable code for both entry points (Root Cause #85).
 *
 * The `FEATURE_PRIZE_DRAWS` gate that used to open this function was DELETED
 * on 2026-10-19. The whole `FEATURE_*` mechanism had already been retired —
 * `audit-feature-flags` bans it strict-zero and `.env.example` declares no
 * such key — but that audit only matched `process.env.FEATURE_*`, and this
 * read it as `ctx.env("FEATURE_PRIZE_DRAWS")`, which the regex could not see.
 * So an env var nothing documented was never set in production and every spin
 * returned 503 `feature_disabled` while the Spin button rendered enabled.
 */

import crypto from "node:crypto";
import type { JobContext } from "../runtime/types";
import {
  EVENT_ENTRY_FIELDS,
  EVENT_FIELDS,
  COMMON_FIELDS,
} from "../../../../constants/field-names";
import { resolveDate } from "../../../../utils";
import { normalizeEventType } from "../../../../features/events/types/index";
import { resolveEventRef } from "./_event-ref";
import { EVENT_DRAW_REASON } from "./event-draw-reasons";

export interface AssignSpinPrizeInput {
  eventId: string;
  /** Logged-in identity. Exactly one of userId/guestIpHash must be set. */
  userId?: string;
  /** Hashed guest identity (see `hashGuestIdentity` in security/rate-limit.ts) — never a raw IP. */
  guestIpHash?: string;
}

export interface AssignSpinPrizeResult {
  /** The canonical DOCUMENT ID, even when the caller passed a slug. */
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
  /**
   * Absent means ACTIVE — matching `BonusSpinView`'s own
   * `prizes.filter(p => p.isActive !== false)`. The two gates used to
   * disagree: the client hid an inactive prize while this core summed every
   * prize's weight regardless, so a wheel whose prizes were all inactive
   * rendered a disabled button and a wheel with one active prize could still
   * award an inactive one.
   */
  isActive?: boolean;
  /** Matches the stored field name on `EventDocument.spinPrizes` (the admin
   * editor and its Zod schema both call it `label`, not `title` — an
   * earlier version of this file used `title` here, which never matched
   * any real document and left `AssignSpinPrizeResult.spinPrizeTitle`
   * permanently undefined; the client never noticed because BonusSpinView
   * resolves the won prize's label from its own already-loaded prizes
   * array instead of this field). */
  label: string;
  weight: number;
  couponId?: string;
}

interface EventForSpin {
  type?: string;
  status?: string;
  endsAt?: Date;
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
  /** Written `?? null` on every spin, so a read can legitimately be null. */
  spinPrizeCouponCode?: string | null;
}

const EVENT_ENTRIES_COLLECTION = "eventEntries";
const COUPONS_COLLECTION = "coupons";

export async function runAssignSpinPrize(
  input: AssignSpinPrizeInput,
  ctx: JobContext,
): Promise<AssignSpinPrizeResult> {
  const { userId, guestIpHash } = input;

  if (!userId && !guestIpHash) {
    return {
      eventId: input.eventId,
      userId,
      reason: EVENT_DRAW_REASON.IDENTITY_REQUIRED,
    };
  }

  /*
   * 🛑 Slug-or-id, not `.doc(eventId)`. Public URLs link by SLUG (`EventCard`
   * builds its href from `event.slug ?? event.id`, and the participate tab
   * reuses that param), so a spin launched from any card link used to resolve
   * to nothing and return `event_not_found` — a 404 on every attempt, forever.
   *
   * Every query and write below uses the RESOLVED `eventId`, never the
   * caller's input: carrying the slug forward is what let one guest count as
   * two identities and silently reset `spinMaxPerUser`.
   */
  const resolved = await resolveEventRef<EventForSpin>(ctx.db, input.eventId);
  if (!resolved) {
    return {
      eventId: input.eventId,
      userId,
      reason: EVENT_DRAW_REASON.EVENT_NOT_FOUND,
    };
  }
  const eventId = resolved.id;
  const event = resolved.data;

  /*
   * The page redirects a non-running event to the overview, so these were
   * never reachable through the UI — but `POST /api/events/<ended>/spin`
   * answered 200 and awarded a prize. A redirect is navigation, not a
   * precondition.
   */
  // 🛑 `normalizeEventType`, not a bare `!==`: pre-2026-10-31 documents still
  // hold `spin_wheel`, and refusing them would break every seeded spin event.
  if (
    event.type &&
    normalizeEventType(event.type) !== EVENT_FIELDS.TYPE_VALUES.BONUS_SPIN
  ) {
    return { eventId, userId, reason: EVENT_DRAW_REASON.NOT_A_SPIN_WHEEL };
  }
  const endsAt = resolveDate(event.endsAt);
  if (
    event.status !== EVENT_FIELDS.STATUS_VALUES.ACTIVE ||
    (endsAt && ctx.now > endsAt)
  ) {
    return { eventId, userId, reason: EVENT_DRAW_REASON.NOT_ACTIVE };
  }

  if (!userId && !event.allowGuestParticipation) {
    return { eventId, userId, reason: EVENT_DRAW_REASON.LOGIN_REQUIRED };
  }

  // Active prizes only — see the `isActive` note on SpinPrize. The weighted
  // pick below iterates this same array, so the gate and the draw agree.
  const prizes = (Array.isArray(event.spinPrizes) ? event.spinPrizes : []).filter(
    (p) => p.isActive !== false,
  );
  const totalWeight = prizes.reduce((s, p) => s + (p.weight ?? 0), 0);
  if (totalWeight <= 0) {
    return { eventId, userId, reason: EVENT_DRAW_REASON.NO_PRIZES_CONFIGURED };
  }

  const windowStart = resolveDate(event.spinWindowStart);
  const windowEnd = resolveDate(event.spinWindowEnd);
  if ((windowStart && ctx.now < windowStart) || (windowEnd && ctx.now > windowEnd)) {
    return { eventId, userId, reason: EVENT_DRAW_REASON.OUTSIDE_SPIN_WINDOW };
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
      /*
       * 🛑 `reason` is REQUIRED here, and its absence was a bug.
       *
       * Both entry points gate on `if (data.reason && !data.spinPrizeId)`, so
       * this branch used to fall through to `successResponse(…, "Spin
       * recorded")` — HTTP 200 for a refusal. When the stored entry happened
       * to carry no `spinPrizeId`, the client then saw a 200 with no prize and
       * printed "Spin failed. Please try again." for what is really "you have
       * already spun".
       */
      return {
        eventId,
        userId,
        spinPrizeId: existingData?.spinPrizeId,
        spinPrizeCouponCode: existingData?.spinPrizeCouponCode ?? undefined,
        alreadyUsed: true,
        reason: EVENT_DRAW_REASON.ALREADY_USED,
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
