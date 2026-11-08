/**
 * Map giveaway slots onto the shape `ClearanceCollage` renders.
 *
 * Shared by all three giveaway surfaces (event giveaway detail, prize-draw-mode
 * giveaway detail, and any future one) so the "which slots get a tile" rule
 * cannot drift between them.
 *
 * Slots with no image are dropped rather than rendered as empty tiles: a
 * giveaway may have 200 slots and only a handful of photographed prizes, and a
 * collage of placeholders communicates nothing. The numbered `GiveawaySlotGrid`
 * below it is still the complete, authoritative slot map.
 */
import type { ClientGiveawaySlot } from "../../../../features/giveaway/types";
import type { CollagePrizeItem } from "../../../../features/products/components/ClearanceCollage";

export function slotsToCollageItems(
  slots: readonly ClientGiveawaySlot[],
): CollagePrizeItem[] {
  return slots
    .filter((slot) => Boolean(slot.image))
    .map((slot) => ({
      itemNumber: slot.slotNumber,
      title: slot.name,
      images: slot.image ? [slot.image] : [],
      // `isBooked` is the giveaway's equivalent of a prize being taken. The
      // collage's own label prop renames the stamp to "Claimed" at the call
      // site — price and weight never reach the client at all.
      isWon: slot.isBooked,
    }));
}
