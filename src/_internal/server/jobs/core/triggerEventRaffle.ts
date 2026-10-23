/**
 * Core: select a raffle winner for an event using `crypto.randomInt()`. Pool
 * logic keys off the event's `raffleType`.
 *
 * ## Three things in here had never worked
 *
 * 1. **The pool query could not match any entry created by this app.** It
 *    asked for `status == "CONFIRMED"` — a real field with a real admin
 *    workflow (`AdminAllEventEntriesView`'s Confirm / Waitlist / Cancel row
 *    actions) but with NO writer at creation time. `enterEvent` never set it
 *    and neither did the seed, so the pool was empty unless an admin had
 *    hand-confirmed every entry one row at a time — on a raffle seeded with
 *    1,892 entries. Every draw returned `no_eligible_entries`; the raffle had
 *    never once been drawable.
 *
 *    The predicate is now `reviewStatus == "approved"`: written on every entry
 *    path, already indexed `(eventId, reviewStatus, submittedAt DESC)`, and
 *    auto-approved for raffles by `enterEvent`. `status` keeps its RSVP
 *    meaning and is deliberately NOT the gate — see the note on both fields in
 *    `constants/field-names.ts`.
 *
 * 2. **`drawsPermitted: 1` was not enforced.** The already-drawn check and the
 *    winner write sat outside any transaction, so two concurrent admin clicks
 *    both saw no winner and both wrote — two winners for one prize. The
 *    check-and-write is now inside `runTransaction`, following the sibling
 *    core `prizeDrawAssignWinner`.
 *
 * 3. **The winner was never told.** A winner was recorded and the only way to
 *    find out was to revisit the event page.
 *
 * The `FEATURE_PRIZE_DRAWS` gate that used to open this function was deleted
 * 2026-10-19 — see the header of `assignSpinPrize.ts`. Its branch here was the
 * second-worst shaped of the nine: it returned early with **no `reason`**, and
 * the route decides success by `if (data.reason && !data.raffleWinnerUserId)`,
 * so a disabled feature answered `200 "Raffle triggered"` with no winner.
 */

import crypto from "node:crypto";
import type { JobContext } from "../runtime/types";
import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { EVENT_ENTRY_FIELDS, EVENT_FIELDS } from "../../../../constants/field-names";
import { EVENT_ENTRY_PII_FIELDS, maskPii } from "../../../../security";
import { resolveEventRef } from "./_event-ref";
import { EVENT_DRAW_REASON } from "./event-draw-reasons";
import { rafflePrizeCouponIdsOf } from "../../../../features/events/schemas/firestore";

/**
 * The winner's display name, masked for a PUBLIC announcement.
 *
 * `maskPii` rather than `eventEntryRepository.maskedEntry` because the pool
 * here is typed as a local `EntryDoc`, not a full `EventEntryDocument` — and
 * `maskPii` takes a plain object, so no cast is needed to use the shared rule.
 */
const maskedWinnerName = (data: { userDisplayName?: string }): string | undefined =>
  maskPii<{ userDisplayName?: string }>(data, EVENT_ENTRY_PII_FIELDS).userDisplayName;

export interface TriggerEventRaffleInput {
  eventId: string;
  raffleType?: "top_n_scorers" | "top_n_participants" | "open_raffle";
  topN?: number;
}

export interface TriggerEventRaffleResult {
  /** The canonical DOCUMENT ID, even when the caller passed a slug. */
  eventId: string;
  raffleWinnerUserId?: string;
  raffleWinnerDisplayName?: string;
  /** The prize coupon's CODE, resolved at draw time and recorded on the event. */
  rafflePrizeCouponCode?: string;
  raffleEntryCount: number;
  alreadyTriggered?: boolean;
  reason?: string;
}

const EVENT_ENTRIES_COLLECTION = "eventEntries";
const COUPONS_COLLECTION = "coupons";

interface EventForRaffle {
  type?: string;
  status?: string;
  hasRaffle?: boolean;
  raffleType?: TriggerEventRaffleInput["raffleType"];
  raffleTopN?: number;
  raffleWinnerUserId?: string;
  /** @deprecated legacy scalar — read via `rafflePrizeCouponIdsOf`, never alone. */
  rafflePrizeCouponId?: string;
  rafflePrizeCouponIds?: string[];
}

type EntryDoc = {
  userId?: string;
  userDisplayName?: string;
  points?: number;
  createdAt?: { toDate?: () => Date } | Date;
};

export async function runTriggerEventRaffle(
  input: TriggerEventRaffleInput,
  ctx: JobContext,
): Promise<TriggerEventRaffleResult> {
  // Slug-or-id — the admin UI passes a doc id, but this shares its resolver
  // with the spin core, which is reached from public slug URLs.
  const resolved = await resolveEventRef<EventForRaffle>(ctx.db, input.eventId);
  if (!resolved) {
    return {
      eventId: input.eventId,
      raffleEntryCount: 0,
      reason: EVENT_DRAW_REASON.EVENT_NOT_FOUND,
    };
  }
  const eventId = resolved.id;
  const eventRef = resolved.ref;
  const event = resolved.data;

  /*
   * Nothing checked that this event HAS a raffle, so the runner would happily
   * draw a winner on a poll or a sale and write `raffleWinnerUserId` onto it.
   * `hasRaffle` is the bolt-on flag; `type === "raffle"` is the dedicated
   * event type. Either qualifies — a raffle-typed event with the flag unset is
   * a seeding omission, not a reason to refuse a legitimate draw.
   */
  if (event.hasRaffle !== true && event.type !== EVENT_FIELDS.TYPE_VALUES.RAFFLE) {
    return { eventId, raffleEntryCount: 0, reason: EVENT_DRAW_REASON.NOT_A_RAFFLE };
  }

  /*
   * A draw is permitted on an ACTIVE or ENDED event, and deliberately not on
   * draft / paused / cancelled. "Ended" is the normal case — a raffle is drawn
   * after entries close — so gating on `active` alone would refuse every real
   * draw. Cancelled is the one that matters: drawing a winner for a cancelled
   * raffle creates an obligation nobody intended.
   */
  if (
    event.status !== EVENT_FIELDS.STATUS_VALUES.ACTIVE &&
    event.status !== EVENT_FIELDS.STATUS_VALUES.ENDED
  ) {
    return { eventId, raffleEntryCount: 0, reason: EVENT_DRAW_REASON.NOT_ACTIVE };
  }

  // Cheap pre-check so the common "already drawn" case costs no transaction.
  // The authoritative check is inside the transaction below — this one races.
  if (event.raffleWinnerUserId) {
    return {
      eventId,
      raffleEntryCount: 0,
      alreadyTriggered: true,
      raffleWinnerUserId: event.raffleWinnerUserId,
      reason: EVENT_DRAW_REASON.ALREADY_TRIGGERED,
    };
  }

  const raffleType = input.raffleType ?? event.raffleType ?? "open_raffle";
  const topN = input.topN ?? event.raffleTopN ?? 0;

  /*
   * Built OUTSIDE the transaction, on purpose. The pool can be large (a seeded
   * raffle claims 1,892 entries) and a Firestore transaction holds locks for
   * everything it reads — so reading the pool inside would make a draw scale
   * its lock footprint with entrant count. The same split as
   * `prizeDrawAssignWinner`: read the candidates normally, then do the
   * check-and-write transactionally.
   *
   * 🛑 `reviewStatus == "approved"`, NOT `status == "CONFIRMED"`. See this
   * file's header. `enterEvent` now auto-approves raffle entries, so a live
   * entrant lands in this pool without an admin touching anything; a FLAGGED
   * entry correctly drops out of it.
   */
  const entriesSnap = await ctx.db
    .collection(EVENT_ENTRIES_COLLECTION)
    .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
    .where(
      EVENT_ENTRY_FIELDS.REVIEW_STATUS,
      "==",
      EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    )
    .get();

  let pool: { id: string; data: EntryDoc }[] = entriesSnap.docs.map((d) => ({
    id: d.id,
    data: d.data() as EntryDoc,
  }));

  if (raffleType === "top_n_scorers" && topN > 0) {
    pool = pool
      .sort((a, b) => (b.data.points ?? 0) - (a.data.points ?? 0))
      .slice(0, topN);
  } else if (raffleType === "top_n_participants" && topN > 0) {
    pool = pool
      .sort((a, b) => {
        const aT = a.data.createdAt instanceof Date
          ? a.data.createdAt.getTime()
          : (a.data.createdAt?.toDate?.()?.getTime() ?? 0);
        const bT = b.data.createdAt instanceof Date
          ? b.data.createdAt.getTime()
          : (b.data.createdAt?.toDate?.()?.getTime() ?? 0);
        return aT - bT;
      })
      .slice(0, topN);
  }

  if (pool.length === 0) {
    return {
      eventId,
      raffleEntryCount: 0,
      reason: EVENT_DRAW_REASON.NO_ELIGIBLE_ENTRIES,
    };
  }

  /*
   * Resolve the prize coupon's CODE before the transaction and record it on the
   * event alongside the winner.
   *
   * `rafflePrizeCouponId` was write-only: accepted by the admin create/update
   * routes, declared in `EVENT_FIELDS`, rendered by the winner page — and never
   * read by this runner. Recording the code here makes the prize durable
   * against a later edit of the event's coupon, the same reason
   * `assignSpinPrize` stores `spinPrizeCouponCode` on the entry rather than
   * re-deriving it. Resolution is best-effort: a missing coupon must not cost
   * somebody their win.
   */
  /*
   * 🛑 Through `rafflePrizeCouponIdsOf`, so an event written before the
   * widening — carrying only the deprecated scalar — still awards its prize.
   * Reading `rafflePrizeCouponIds` alone would silently hand those winners
   * nothing, and a raffle that draws a winner and awards no prize is a bug
   * with no error and no second chance: the draw is irreversible.
   */
  const prizeCouponIds = rafflePrizeCouponIdsOf(event);
  const rafflePrizeCouponCodes: string[] = [];
  if (prizeCouponIds.length > 0) {
    /*
     * ONE `getAll` for all of them, not a loop of `.get()`. This runs inside a
     * Cloud Function rather than a Vercel route, so it is not against Rule #6's
     * 10s ceiling — but it sits immediately before a transaction, and holding
     * N sequential round trips open there widens the window in which a
     * concurrent draw can collide.
     */
    const refs = prizeCouponIds.map((id) => ctx.db.collection(COUPONS_COLLECTION).doc(id));
    const snaps = await ctx.db.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) {
        const code = (snap.data() as { code?: string }).code;
        if (code) rafflePrizeCouponCodes.push(code);
      } else {
        /*
         * Best-effort, per coupon: one deleted coupon must not cost the
         * winner the other prizes, and must not cost them the win at all.
         * Warned rather than thrown for exactly that reason.
         */
        ctx.logger.warn("Raffle prize couponId does not resolve to a coupon", {
          eventId,
          couponId: snap.id,
        });
      }
    }
  }
  /*
   * The first code is still written to the singular `rafflePrizeCouponCode`
   * the winner page already reads, so that page keeps working untouched while
   * the full list lands beside it. Dropping the scalar would blank the prize
   * on every existing winner announcement.
   */
  const rafflePrizeCouponCode: string | undefined = rafflePrizeCouponCodes[0];

  /*
   * 🛑 The one-draw invariant. Re-read the event INSIDE the transaction.
   *
   * The pre-check above reads outside it, so two admins clicking at the same
   * moment both pass it. Firestore aborts and retries a transaction whose read
   * set changed, so whichever commits second sees the first winner here and
   * bails. Two winners for one prize is the failure the tester's own case
   * calls the most serious on this page, and it was fully reachable.
   */
  const drawn = await ctx.db.runTransaction(async (tx) => {
    const fresh = await tx.get(eventRef);
    const freshData = (fresh.data() ?? {}) as EventForRaffle;
    if (freshData.raffleWinnerUserId) {
      return {
        alreadyTriggered: true as const,
        raffleWinnerUserId: freshData.raffleWinnerUserId,
      };
    }

    const winner = pool[crypto.randomInt(0, pool.length)];
    const maskedName = maskedWinnerName(winner.data) ?? "";

    tx.update(eventRef, {
      [EVENT_FIELDS.RAFFLE_WINNER_USER_ID]: winner.data.userId,
      /*
       * 🛑 MASKED, not raw. `userDisplayName` is an `EVENT_ENTRY_PII_FIELDS`
       * member, so an entry read returns ciphertext — and this writes onto the
       * EVENT document, where the field is neither encrypted nor decrypted, and
       * is then shown PUBLICLY as the raffle winner. Masked rather than revealed
       * because a public winner announcement is exactly the surface that should
       * read "R*** K***".
       */
      [EVENT_FIELDS.RAFFLE_WINNER_DISPLAY_NAME]: maskedName,
      [EVENT_FIELDS.RAFFLE_WINNER_ENTRY_ID]: winner.id,
      [EVENT_FIELDS.RAFFLE_TRIGGERED_AT]: ctx.now,
      [EVENT_FIELDS.RAFFLE_ENTRY_COUNT]: entriesSnap.size,
      ...(rafflePrizeCouponCode ? { rafflePrizeCouponCode } : {}),
      ...(rafflePrizeCouponCodes.length > 0 ? { rafflePrizeCouponCodes } : {}),
      [EVENT_FIELDS.RAFFLE_GITHUB_FUNCTION_URL]:
        `${ctx.env("PROOF_OF_FAIRNESS_BASE_URL") ?? ""}/raffles/${eventId}.json`,
      [EVENT_FIELDS.UPDATED_AT]: ctx.now,
    });

    return {
      alreadyTriggered: false as const,
      winnerId: winner.id,
      userId: winner.data.userId,
      maskedName,
    };
  });

  if (drawn.alreadyTriggered) {
    return {
      eventId,
      raffleEntryCount: 0,
      alreadyTriggered: true,
      raffleWinnerUserId: drawn.raffleWinnerUserId,
      reason: EVENT_DRAW_REASON.ALREADY_TRIGGERED,
    };
  }

  ctx.logger.info("Event raffle triggered", {
    eventId,
    raffleType,
    poolSize: pool.length,
    winnerId: drawn.winnerId,
  });

  /*
   * Tell the winner. Best-effort and AFTER the commit: a notification that
   * fails must not roll back a recorded draw (the draw is irreversible and
   * re-running it would pick a different winner), and a send inside the
   * transaction would be retried on every abort. Same shape as
   * `prizeDrawAssignWinner`.
   */
  if (drawn.userId) {
    try {
      await sendNotification({
        userId: drawn.userId,
        type: "prize_won",
        priority: "high",
        title: "You won the raffle!",
        message: rafflePrizeCouponCode
          ? `You've been drawn as the winner. Your prize coupon code is ${rafflePrizeCouponCode}.`
          : "You've been drawn as the winner — open the event to see your prize.",
        relatedId: eventId,
        relatedType: "event",
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.warn("Raffle winner notification failed", {
        eventId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    eventId,
    raffleWinnerUserId: drawn.userId,
    raffleWinnerDisplayName: drawn.maskedName,
    rafflePrizeCouponCode,
    raffleEntryCount: entriesSnap.size,
  };
}
