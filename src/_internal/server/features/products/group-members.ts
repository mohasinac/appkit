/**
 * Public projection for a product-group member.
 *
 * `GET /api/products/group/[groupId]` previously returned
 * `sanitizeProductsForPublic(items)`, which is a DELETE-LIST of four
 * seller-identity keys — every other field of `ProductDocument` went to the
 * browser, including fields nobody had thought about. Per § "Public Data
 * Projections", a public payload is built by naming what goes out, never by
 * spreading a document and removing keys: a denial keyed on today's field list
 * is structurally blind to the field added tomorrow.
 *
 * The member picker needs more than the old response carried (stock, store,
 * sold state, gstRate), so widening the payload was required either way —
 * which made this the moment to make it an allow-list rather than a wider
 * deny-list.
 */

import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ListingType } from "../../../../features/products/types/index";
import { normalizeListingType } from "../../../../features/products/utils/listing-type";

/**
 * Every field the group picker and the group table render. If a field is not
 * here it does not reach the browser.
 *
 * Deliberately absent, with reasons:
 *  - `sellerId` / `ownerId` / `sellerName` / `sellerEmail` — seller identity;
 *    public clients see store-scoped identity only.
 *  - `costPrice`, `profitMargin`, `supplier*`, `adminNotes` — seller-private
 *    commercial data.
 *  - `stockQuantity` — the internal figure; `availableQuantity` is the one the
 *    buyer may act on.
 */
export interface PublicGroupMember {
  id: string;
  slug?: string;
  title: string;
  price: number;
  currency?: string;
  /** First image only — the picker renders a thumbnail, never a gallery. */
  image?: string;
  condition?: string;
  listingType: ListingType;
  isGroupParent?: boolean;
  groupTitle?: string;
  /** Drives the stepper's `max`. */
  availableQuantity: number;
  storeId: string;
  storeName?: string;
  status: string;
  isSold?: boolean;
  /** Needed so the picker can show a tax-inclusive hint and the cart line can
   *  snapshot it for per-member GST proration at checkout. */
  gstRate?: 0 | 5 | 12 | 18 | 28;
  hsnCode?: string;
}

export function toPublicGroupMember(doc: ProductDocument): PublicGroupMember {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    price: doc.price,
    currency: doc.currency,
    image: doc.images?.[0] ?? doc.mainImage,
    condition: doc.condition,
    listingType: normalizeListingType(doc),
    isGroupParent: doc.isGroupParent,
    groupTitle: doc.groupTitle,
    availableQuantity: doc.availableQuantity ?? 0,
    storeId: doc.storeId,
    storeName: doc.storeName,
    status: doc.status,
    isSold: doc.isSold,
    gstRate: doc.gstRate,
    hsnCode: doc.hsnCode,
  };
}

export function toPublicGroupMembers(docs: readonly ProductDocument[]): PublicGroupMember[] {
  return docs.map(toPublicGroupMember);
}
