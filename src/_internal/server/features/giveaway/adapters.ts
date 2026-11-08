/**
 * Giveaway adapters — strips server-only fields (price, weight)
 * before any slot/config data leaves the server.
 */
import type { GiveawayConfig, GiveawaySlot, ClientGiveawayConfig, ClientGiveawaySlot } from "../../../../features/giveaway/types";

/**
 * Strip price and weight from a single slot for client consumption.
 *
 * Takes the loose shape rather than `GiveawaySlot` so it can be applied to a
 * value already TYPED as projected but not actually projected — which is the
 * state `EventItem.giveawayConfig` is in when it comes off the repository.
 */
export function toClientGiveawaySlot(slot: GiveawaySlot | ClientGiveawaySlot): ClientGiveawaySlot {
  // Allow-list, not a spread: every field named here is a deliberate public
  // exposure with a known reader (§ Public Data Projections). `image` is read
  // by the prize collage on the giveaway detail page.
  return {
    slotNumber: slot.slotNumber,
    name: slot.name,
    image: slot.image,
    isBooked: slot.isBooked,
    bookedByUserGiveawayNumber: slot.bookedByUserGiveawayNumber,
    bookedByDisplayName: slot.bookedByDisplayName,
  };
}

/** Strip price/weight from the entire config for client consumption. */
export function toClientGiveawayConfig(
  config: GiveawayConfig | ClientGiveawayConfig,
): ClientGiveawayConfig {
  return {
    slots: config.slots.map(toClientGiveawaySlot),
    totalSlots: config.totalSlots,
    pricingMode: config.pricingMode,
    drawWindowDurationMinutes: config.drawWindowDurationMinutes,
    maxPullsPerTransaction: config.maxPullsPerTransaction,
    maxPullsPerUser: config.maxPullsPerUser,
  };
}
