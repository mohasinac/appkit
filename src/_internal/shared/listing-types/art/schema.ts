import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isArtProduct(doc: ProductDocument): boolean {
  return doc.listingType === "art";
}
