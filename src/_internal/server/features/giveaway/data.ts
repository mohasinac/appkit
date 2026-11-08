import { cache } from "react";
import { eventRepository } from "../../../../repositories";
import { normalizeEventType } from "../../../../features/events/types/index";
import { giveawayEntryRepository } from "../../../../features/giveaway/repository/giveaway-entry.repository";
import { toClientGiveawayConfig } from "./adapters";
import type { SieveModel } from "../../../../providers/db-firebase";
import type { EventDocument } from "../../../../features/events/schemas/firestore";

import type { ClientGiveawayConfig } from "../../../../features/giveaway/types";

/** Event shape with giveaway config stripped of price/weight. */
export type GiveawayEventClient = Omit<EventDocument, "giveawayConfig"> & {
  giveawayConfig?: ClientGiveawayConfig;
};

/** Fetch a random-draw event with price/weight stripped for client use. */
export const getGiveawayEventCached = cache(async (id: string): Promise<GiveawayEventClient | null> => {
  const event = await eventRepository.findById(id);
  // 🛑 `normalizeEventType`, not `===`: pre-2026-10-31 documents still hold
  // `type: "giveaway"`, and a bare equality returns null for every one.
  if (!event || normalizeEventType(event.type) !== "random-draw") return null;
  return {
    ...event,
    giveawayConfig: event.giveawayConfig ? toClientGiveawayConfig(event.giveawayConfig) : undefined,
  };
});

/** List all random-draw events with price/weight stripped. */
export const listGiveawayEvents = cache(
  async (opts?: { status?: string; page?: number; pageSize?: number }): Promise<GiveawayEventClient[]> => {
    // Build Sieve filter: type==random-draw (or the legacy `giveaway`),
    // optionally also status.
    //
    // 🛑 A RAW filter string, so `tsc` cannot see this value at all — it was
    // `"type==giveaway"` and the rename would have silently emptied /giveaway
    // while still answering 200 (Root Cause #33/#99).
    //
    // 🛑 PIPE-joined, never comma-joined. Sieve parses `type==a|b` as one
    // OR-group and the Firebase adapter upgrades a same-field OR-group of
    // equalities into a single Firestore `in`. A comma is an AND, so
    // `type==random-draw,type==giveaway` is two equalities on one field that no
    // document can satisfy (Root Cause #59). The legacy arm can be dropped
    // once the rename migration has run everywhere.
    let filters = "type==random-draw|giveaway";
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
      giveawayConfig: event.giveawayConfig ? toClientGiveawayConfig(event.giveawayConfig) : undefined,
    }));
  },
);

/** Fetch giveaway entries for admin view (includes phone + txId via PII decrypt). */
export async function getGiveawayEntriesForAdmin(
  sourceType: "event" | "product",
  sourceId: string,
  model: SieveModel,
) {
  const field = sourceType === "event" ? "eventId" : "productId";
  return giveawayEntryRepository.listForSource(sourceId, field, model);
}

/** Fetch giveaway entries for a specific user (own entries only). */
export async function getGiveawayEntriesForUser(
  userId: string,
  model: SieveModel,
) {
  return giveawayEntryRepository.listForUser(userId, model);
}
