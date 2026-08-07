import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isStickersProduct(doc: ProductDocument): boolean {
  return doc.listingType === "stickers";
}
