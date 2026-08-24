/**
 * Map lottery slots onto the shape `PrizeDrawCollage` renders.
 *
 * Shared by all three lottery surfaces (event lottery detail, prize-draw-mode
 * lottery detail, and any future one) so the "which slots get a tile" rule
 * cannot drift between them.
 *
 * Slots with no image are dropped rather than rendered as empty tiles: a
 * lottery may have 200 slots and only a handful of photographed prizes, and a
 * collage of placeholders communicates nothing. The numbered `LotterySlotGrid`
 * below it is still the complete, authoritative slot map.
 */
import type { ClientLotterySlot } from "../../../../features/lottery/types";
import type { CollagePrizeItem } from "../../../../features/products/components/PrizeDrawCollage";

export function slotsToCollageItems(
  slots: readonly ClientLotterySlot[],
): CollagePrizeItem[] {
  return slots
    .filter((slot) => Boolean(slot.image))
    .map((slot) => ({
      itemNumber: slot.slotNumber,
      title: slot.name,
      images: slot.image ? [slot.image] : [],
      // `isBooked` is the lottery's equivalent of a prize being taken. The
      // collage's own label prop renames the stamp to "Claimed" at the call
      // site — price and weight never reach the client at all.
      isWon: slot.isBooked,
    }));
}
