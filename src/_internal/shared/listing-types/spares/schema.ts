import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isSparesProduct(doc: ProductDocument): boolean {
  return doc.listingType === "spares";
}
