import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isClassifiedProduct(doc: ProductDocument): boolean {
  return doc.listingType === "classified";
}
