import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isRandomLotProduct(doc: ProductDocument): boolean {
  return doc.listingType === "random-lots";
}

// True when entries are still accepted (reveal window has not started, slots not exhausted).
export function isOpenRandomLot(doc: ProductDocument): boolean {
  if (!isRandomLotProduct(doc)) return false;
  const max = doc.prizeMaxEntries ?? null;
  const current = doc.prizeCurrentEntries ?? 0;
  if (typeof max === "number" && current >= max) return false;
  return !doc.prizeRevealWindowStart || doc.prizeRevealWindowStart > new Date();
}
