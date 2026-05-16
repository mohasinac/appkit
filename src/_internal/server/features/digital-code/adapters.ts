import type { ProductDocument, ProductDigitalCodeMeta } from "../../../../features/products/schemas/firestore";
import { formatCurrency } from "../../../../utils/number.formatter";

export interface DigitalCodeClientShape {
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
  /** Delivery method and redemption instructions — codesAvailable intentionally omitted (operational). */
  digitalCode: Pick<ProductDigitalCodeMeta, "codeDeliveryMethod" | "redemptionInstructions"> | null;
  status: ProductDocument["status"];
  createdAt: string;
}

/** Maps a raw `ProductDocument` to the client-safe digital-code shape. Strips codesAvailable/codePoolSize (operational counters). */
export function toClientDigitalCode(doc: ProductDocument): DigitalCodeClientShape {
  const dc = doc.digitalCode ?? null;
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
    digitalCode: dc
      ? {
          codeDeliveryMethod: dc.codeDeliveryMethod,
          redemptionInstructions: dc.redemptionInstructions,
        }
      : null,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };
}
