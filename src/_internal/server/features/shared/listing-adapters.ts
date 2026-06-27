import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { formatCurrency } from "../../../../utils/number.formatter";

// The 11 fields every listing type exposes to the client.
// Per-type adapter shapes extend this — prevents field drift across 3 adapter files.
export interface BaseListingClientShape {
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
  status: ProductDocument["status"];
  createdAt: string;
}

/** Maps the 11 shared fields from a raw Firestore ProductDocument. */
export function mapBaseListingFields(doc: ProductDocument): BaseListingClientShape {
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
    category: doc.categorySlugs?.[0] ?? doc.category ?? "",
    tags: doc.tags ?? [],
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}
