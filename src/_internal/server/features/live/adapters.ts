import type { ProductDocument, ProductLiveItemMeta } from "../../../../features/products/schemas/firestore";
import { mapBaseListingFields, type BaseListingClientShape } from "../shared/listing-adapters";

export interface LiveItemClientShape extends BaseListingClientShape {
  /** Live-item meta — vendorVerified is intentionally omitted (admin-only). */
  liveItem: Omit<ProductLiveItemMeta, "vendorVerified"> | null;
}

/** Maps a raw `ProductDocument` to the client-safe live-item shape. Strips vendorVerified (admin-only). */
export function toClientLiveItem(doc: ProductDocument): LiveItemClientShape {
  const li = doc.liveItem ?? null;
  return {
    ...mapBaseListingFields(doc),
    liveItem: li
      ? {
          species: li.species,
          ageMonths: li.ageMonths,
          sex: li.sex,
          careInfo: li.careInfo,
          transport: li.transport,
          jurisdictionAllowed: li.jurisdictionAllowed,
          cites: li.cites,
        }
      : null,
  };
}
