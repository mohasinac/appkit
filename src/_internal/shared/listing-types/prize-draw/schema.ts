import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isPrizeDrawProduct(doc: ProductDocument): boolean {
  return doc.listingType === "prize-draw";
}

// True when entries are still accepted (reveal window has not started, slots not exhausted).
export function isOpenPrizeDraw(doc: ProductDocument): boolean {
  if (!isPrizeDrawProduct(doc)) return false;
  const max = doc.prizeMaxEntries ?? null;
  const current = doc.prizeCurrentEntries ?? 0;
  if (typeof max === "number" && current >= max) return false;
  return !doc.prizeRevealWindowStart || doc.prizeRevealWindowStart > new Date();
}
