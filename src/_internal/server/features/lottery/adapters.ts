/**
 * Lottery adapters — strips server-only fields (price, weight)
 * before any slot/config data leaves the server.
 */
import type { LotteryConfig, LotterySlot, ClientLotteryConfig, ClientLotterySlot } from "../../../../features/lottery/types";

/** Strip price and weight from a single slot for client consumption. */
export function toClientLotterySlot(slot: LotterySlot): ClientLotterySlot {
  // Allow-list, not a spread: every field named here is a deliberate public
  // exposure with a known reader (§ Public Data Projections). `image` is read
  // by the prize collage on the lottery detail page.
  return {
    slotNumber: slot.slotNumber,
    name: slot.name,
    image: slot.image,
    isBooked: slot.isBooked,
    bookedByUserLotteryNumber: slot.bookedByUserLotteryNumber,
    bookedByDisplayName: slot.bookedByDisplayName,
  };
}

/** Strip price/weight from the entire config for client consumption. */
export function toClientLotteryConfig(config: LotteryConfig): ClientLotteryConfig {
  return {
    slots: config.slots.map(toClientLotterySlot),
    totalSlots: config.totalSlots,
    pricingMode: config.pricingMode,
    drawWindowDurationMinutes: config.drawWindowDurationMinutes,
    maxPullsPerTransaction: config.maxPullsPerTransaction,
    maxPullsPerUser: config.maxPullsPerUser,
  };
}
