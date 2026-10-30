import { cache } from "react";
import { eventRepository } from "../../../../repositories";
import { normalizeEventType } from "../../../../features/events/types/index";
import { lotteryEntryRepository } from "../../../../features/lottery/repository/lottery-entry.repository";
import { toClientLotteryConfig } from "./adapters";
import type { SieveModel } from "../../../../providers/db-firebase";
import type { EventDocument } from "../../../../features/events/schemas/firestore";

import type { ClientLotteryConfig } from "../../../../features/lottery/types";

/** Event shape with lottery config stripped of price/weight. */
export type LotteryEventClient = Omit<EventDocument, "lotteryConfig"> & {
  lotteryConfig?: ClientLotteryConfig;
};

/** Fetch a random-draw event with price/weight stripped for client use. */
export const getLotteryEventCached = cache(async (id: string): Promise<LotteryEventClient | null> => {
  const event = await eventRepository.findById(id);
  // 🛑 `normalizeEventType`, not `===`: pre-2026-10-31 documents still hold
  // `type: "lottery"`, and a bare equality returns null for every one.
  if (!event || normalizeEventType(event.type) !== "random-draw") return null;
  return {
    ...event,
    lotteryConfig: event.lotteryConfig ? toClientLotteryConfig(event.lotteryConfig) : undefined,
  };
});

/** List all random-draw events with price/weight stripped. */
export const listLotteryEvents = cache(
  async (opts?: { status?: string; page?: number; pageSize?: number }): Promise<LotteryEventClient[]> => {
    // Build Sieve filter: type==random-draw (or the legacy `lottery`),
    // optionally also status.
    //
    // 🛑 A RAW filter string, so `tsc` cannot see this value at all — it was
    // `"type==lottery"` and the rename would have silently emptied /lottery
    // while still answering 200 (Root Cause #33/#99).
    //
    // 🛑 PIPE-joined, never comma-joined. Sieve parses `type==a|b` as one
    // OR-group and the Firebase adapter upgrades a same-field OR-group of
    // equalities into a single Firestore `in`. A comma is an AND, so
    // `type==random-draw,type==lottery` is two equalities on one field that no
    // document can satisfy (Root Cause #59). The legacy arm can be dropped
    // once the rename migration has run everywhere.
    let filters = "type==random-draw|lottery";
    if (opts?.status) filters += `,status==${opts.status}`;
    const result = await eventRepository.list({
      filters,
      sorts: "-startsAt",
      page: opts?.page ?? 1,
      pageSize: opts?.pageSize ?? 50,
    });
    const items = result.items ?? [];
    return items.map((event) => ({
      ...event,
      lotteryConfig: event.lotteryConfig ? toClientLotteryConfig(event.lotteryConfig) : undefined,
    }));
  },
);

/** Fetch lottery entries for admin view (includes phone + txId via PII decrypt). */
export async function getLotteryEntriesForAdmin(
  sourceType: "event" | "product",
  sourceId: string,
  model: SieveModel,
) {
  const field = sourceType === "event" ? "eventId" : "productId";
  return lotteryEntryRepository.listForSource(sourceId, field, model);
}

/** Fetch lottery entries for a specific user (own entries only). */
export async function getLotteryEntriesForUser(
  userId: string,
  model: SieveModel,
) {
  return lotteryEntryRepository.listForUser(userId, model);
}
