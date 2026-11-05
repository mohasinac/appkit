import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isClearanceProduct(doc: ProductDocument): boolean {
  return doc.listingType === "clearance";
}

// True when entries are still accepted (reveal window has not started, slots not exhausted).
export function isOpenClearance(doc: ProductDocument): boolean {
  if (!isClearanceProduct(doc)) return false;
  const max = doc.prizeMaxEntries ?? null;
  const current = doc.prizeCurrentEntries ?? 0;
  if (typeof max === "number" && current >= max) return false;
  return !doc.prizeRevealWindowStart || doc.prizeRevealWindowStart > new Date();
}
