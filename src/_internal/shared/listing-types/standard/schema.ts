import type { ProductDocument } from "../../../../features/products/schemas/firestore";

// Standard is the default — any product without an explicit listingType is treated as standard.
export function isStandardProduct(doc: ProductDocument): boolean {
  return doc.listingType === "standard" || doc.listingType == null;
}
