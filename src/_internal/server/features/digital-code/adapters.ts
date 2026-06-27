import type { ProductDocument, ProductDigitalCodeMeta } from "../../../../features/products/schemas/firestore";
import { mapBaseListingFields, type BaseListingClientShape } from "../shared/listing-adapters";

export interface DigitalCodeClientShape extends BaseListingClientShape {
  /** Delivery method and redemption instructions — codesAvailable intentionally omitted (operational). */
  digitalCode: Pick<ProductDigitalCodeMeta, "codeDeliveryMethod" | "redemptionInstructions"> | null;
}

/** Maps a raw `ProductDocument` to the client-safe digital-code shape. Strips codesAvailable/codePoolSize (operational counters). */
export function toClientDigitalCode(doc: ProductDocument): DigitalCodeClientShape {
  const dc = doc.digitalCode ?? null;
  return {
    ...mapBaseListingFields(doc),
    digitalCode: dc
      ? {
          codeDeliveryMethod: dc.codeDeliveryMethod,
          redemptionInstructions: dc.redemptionInstructions,
        }
      : null,
  };
}
