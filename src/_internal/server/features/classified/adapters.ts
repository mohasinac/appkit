import type { ProductDocument, ProductClassifiedMeta } from "../../../../features/products/schemas/firestore";
import { formatCurrency } from "../../../../utils/number.formatter";

export interface ClassifiedClientShape {
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
  condition: ProductDocument["condition"] | null;
  tags: string[];
  classified: ProductClassifiedMeta | null;
  status: ProductDocument["status"];
  createdAt: string;
}

/** Maps a raw `ProductDocument` to the client-safe classified shape. */
export function toClientClassified(doc: ProductDocument): ClassifiedClientShape {
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
    condition: doc.condition ?? null,
    tags: doc.tags ?? [],
    classified: doc.classified ?? null,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };
}
