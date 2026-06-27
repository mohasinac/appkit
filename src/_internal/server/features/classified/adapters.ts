import type { ProductDocument, ProductClassifiedMeta } from "../../../../features/products/schemas/firestore";
import { mapBaseListingFields, type BaseListingClientShape } from "../shared/listing-adapters";

export interface ClassifiedClientShape extends BaseListingClientShape {
  condition: ProductDocument["condition"] | null;
  classified: ProductClassifiedMeta | null;
}

/** Maps a raw `ProductDocument` to the client-safe classified shape. */
export function toClientClassified(doc: ProductDocument): ClassifiedClientShape {
  return {
    ...mapBaseListingFields(doc),
    condition: doc.condition ?? null,
    classified: doc.classified ?? null,
  };
}
