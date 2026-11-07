import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export function isArtAndStickersProduct(doc: ProductDocument): boolean {
  return doc.listingType === "art-and-stickers";
}
