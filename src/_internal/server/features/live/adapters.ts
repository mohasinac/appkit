import type { ProductDocument, ProductLiveItemMeta } from "../../../../features/products/schemas/firestore";
import { formatCurrency } from "../../../../utils/number.formatter";

export interface LiveItemClientShape {
  id: string;
  title: string;
  description: string;
  price: number;
  priceLabel: string;
  currency: string;
  mainImage: string | null;
  images: string[];
  storeId: string;
  storeName: string | null;
  category: string;
  tags: string[];
  /** Live-item meta — vendorVerified is intentionally omitted (admin-only). */
  liveItem: Omit<ProductLiveItemMeta, "vendorVerified"> | null;
  status: ProductDocument["status"];
  createdAt: string;
}

/** Maps a raw `ProductDocument` to the client-safe live-item shape. Strips vendorVerified (admin-only). */
export function toClientLiveItem(doc: ProductDocument): LiveItemClientShape {
  const li = doc.liveItem ?? null;
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    price: doc.price,
    priceLabel: formatCurrency(doc.price, doc.currency ?? "INR"),
    currency: doc.currency ?? "INR",
    mainImage: doc.mainImage || doc.images?.[0] || null,
    images: doc.images ?? [],
    storeId: doc.storeId,
    storeName: doc.storeName ?? null,
    category: doc.category,
    tags: doc.tags ?? [],
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
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };
}
