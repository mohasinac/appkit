import { cache } from "react";
import { eventRepository } from "../../../../repositories";
import { lotteryEntryRepository } from "../../../../features/lottery/repository/lottery-entry.repository";
import { toClientLotteryConfig } from "./adapters";
import type { SieveModel } from "../../../../providers/db-firebase";
import type { EventDocument } from "../../../../features/events/schemas/firestore";

import type { ClientLotteryConfig } from "../../../../features/lottery/types";

/** Event shape with lottery config stripped of price/weight. */
export type LotteryEventClient = Omit<EventDocument, "lotteryConfig"> & {
  lotteryConfig?: ClientLotteryConfig;
};

/** Fetch a lottery-type event with price/weight stripped for client use. */
export const getLotteryEventCached = cache(async (id: string): Promise<LotteryEventClient | null> => {
  const event = await eventRepository.findById(id);
  if (!event || event.type !== "lottery") return null;
  return {
    ...event,
    lotteryConfig: event.lotteryConfig ? toClientLotteryConfig(event.lotteryConfig) : undefined,
  };
});

/** List all lottery-type events with price/weight stripped. */
export const listLotteryEvents = cache(
  async (opts?: { status?: string; page?: number; pageSize?: number }): Promise<LotteryEventClient[]> => {
    // Build Sieve filter: type==lottery, optionally also status
    let filters = "type==lottery";
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
