/**
 * Core: select a raffle winner for an event using `crypto.randomInt()`. Pool
 * logic keys off the event's `raffleType`.
 */

import crypto from "node:crypto";
import type { JobContext } from "../runtime/types";

export interface TriggerEventRaffleInput {
  eventId: string;
  raffleType?: "top_n_scorers" | "top_n_participants" | "open_raffle";
  topN?: number;
}

export interface TriggerEventRaffleResult {
  eventId: string;
  raffleWinnerUserId?: string;
  raffleWinnerDisplayName?: string;
  raffleEntryCount: number;
  alreadyTriggered?: boolean;
  reason?: string;
}

const EVENTS_COLLECTION = "events";
const EVENT_ENTRIES_COLLECTION = "eventEntries";

export async function runTriggerEventRaffle(
  input: TriggerEventRaffleInput,
  ctx: JobContext,
): Promise<TriggerEventRaffleResult> {
  const eventRef = ctx.db.collection(EVENTS_COLLECTION).doc(input.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    return {
      eventId: input.eventId,
      raffleEntryCount: 0,
      reason: "event_not_found",
    };
  }
  const event = eventSnap.data() as {
    raffleType?: TriggerEventRaffleInput["raffleType"];
    raffleTopN?: number;
    raffleWinnerUserId?: string;
  };

  if (event.raffleWinnerUserId) {
    return {
      eventId: input.eventId,
      raffleEntryCount: 0,
      alreadyTriggered: true,
      raffleWinnerUserId: event.raffleWinnerUserId,
    };
  }

  const raffleType = input.raffleType ?? event.raffleType ?? "open_raffle";
  const topN = input.topN ?? event.raffleTopN ?? 0;

  const entriesSnap = await ctx.db
    .collection(EVENT_ENTRIES_COLLECTION)
    .where("eventId", "==", input.eventId)
    .where("status", "==", "CONFIRMED")
    .get();

  type EntryDoc = {
    userId?: string;
    userDisplayName?: string;
    points?: number;
    createdAt?: { toDate?: () => Date } | Date;
  };
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
      eventId: input.eventId,
      raffleEntryCount: 0,
      reason: "no_eligible_entries",
    };
  }

  const winnerIdx = crypto.randomInt(0, pool.length);
  const winner = pool[winnerIdx];

  await eventRef.update({
    raffleWinnerUserId: winner.data.userId,
    raffleWinnerDisplayName: winner.data.userDisplayName ?? "",
    raffleWinnerEntryId: winner.id,
    raffleTriggeredAt: ctx.now,
    raffleEntryCount: entriesSnap.size,
    raffleGithubFunctionUrl: `${ctx.env("PROOF_OF_FAIRNESS_BASE_URL") ?? ""}/raffles/${input.eventId}.json`,
    updatedAt: ctx.now,
  });

  ctx.logger.info("Event raffle triggered", {
    eventId: input.eventId,
    raffleType,
    poolSize: pool.length,
    winnerId: winner.id,
  });

  return {
    eventId: input.eventId,
    raffleWinnerUserId: winner.data.userId,
    raffleWinnerDisplayName: winner.data.userDisplayName,
    raffleEntryCount: entriesSnap.size,
  };
}
